from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import pandas as pd
import numpy as np
import io
import base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import plotly.graph_objects as go
import plotly.utils
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import json
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="HR Analytics API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class Employee(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: Optional[str] = None
    age: Optional[int] = None
    attrition: Optional[str] = None
    business_travel: Optional[str] = None
    daily_rate: Optional[int] = None
    department: Optional[str] = None
    distance_from_home: Optional[int] = None
    education: Optional[int] = None
    education_field: Optional[str] = None
    environment_satisfaction: Optional[int] = None
    gender: Optional[str] = None
    hourly_rate: Optional[int] = None
    job_involvement: Optional[int] = None
    job_level: Optional[int] = None
    job_role: Optional[str] = None
    job_satisfaction: Optional[int] = None
    marital_status: Optional[str] = None
    monthly_income: Optional[int] = None
    monthly_rate: Optional[int] = None
    num_companies_worked: Optional[int] = None
    over_18: Optional[str] = None
    over_time: Optional[str] = None
    percent_salary_hike: Optional[int] = None
    performance_rating: Optional[int] = None
    relationship_satisfaction: Optional[int] = None
    standard_hours: Optional[int] = None
    stock_option_level: Optional[int] = None
    total_working_years: Optional[int] = None
    training_times_last_year: Optional[int] = None
    work_life_balance: Optional[int] = None
    years_at_company: Optional[int] = None
    years_in_current_role: Optional[int] = None
    years_since_last_promotion: Optional[int] = None
    years_with_curr_manager: Optional[int] = None
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmployeeUpload(BaseModel):
    employees: List[Dict[str, Any]]

class PredictionRequest(BaseModel):
    employee_data: Dict[str, Any]

class PredictionResponse(BaseModel):
    attrition_probability: float
    risk_level: str
    factors: List[Dict[str, Any]]

class InsightsRequest(BaseModel):
    data_summary: Dict[str, Any]
    question: Optional[str] = None

# Initialize LLM Chat
async def get_llm_insights(data_summary: Dict, question: str = None):
    try:
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            raise ValueError("EMERGENT_LLM_KEY not found")
            
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"hr-insights-{uuid.uuid4()}",
            system_message="""You are an HR Analytics expert. Provide clear, actionable insights about employee attrition patterns and retention strategies based on data analysis results. 
            
            Focus on:
            1. Key attrition drivers and risk factors
            2. Department-wise trends and patterns
            3. Salary, satisfaction, and performance correlations
            4. Practical retention recommendations
            5. Business impact and ROI considerations
            
            Use business language that HR leaders can understand and act upon."""
        ).with_model("openai", "gpt-5")
        
        prompt = f"""
        Based on this HR analytics data summary, provide actionable insights:
        
        Data Summary:
        {json.dumps(data_summary, indent=2)}
        
        {"Additional Question: " + question if question else ""}
        
        Please provide:
        1. Top 3 attrition risk factors
        2. Department-specific insights
        3. Recommended retention strategies
        4. Expected business impact
        
        Keep it concise and action-oriented.
        """
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return response
        
    except Exception as e:
        logging.error(f"LLM insights error: {str(e)}")
        return "AI insights temporarily unavailable. Please try again later."

# Helper functions
def prepare_data_for_ml(df):
    """Prepare dataframe for machine learning"""
    # Create a copy
    df_ml = df.copy()
    
    # Encode categorical variables
    le_dict = {}
    categorical_columns = df_ml.select_dtypes(include=['object']).columns
    
    for col in categorical_columns:
        if col not in ['employee_id', 'id', 'uploaded_at']:
            le = LabelEncoder()
            df_ml[col] = le.fit_transform(df_ml[col].astype(str))
            le_dict[col] = le
    
    return df_ml, le_dict

def generate_plots(df):
    """Generate various analytics plots"""
    plots = {}
    
    # Set style
    plt.style.use('default')
    sns.set_palette("husl")
    
    # 1. Attrition Rate by Department
    if 'department' in df.columns and 'attrition' in df.columns:
        fig, ax = plt.subplots(figsize=(12, 6))
        attrition_dept = df.groupby('department')['attrition'].apply(lambda x: (x == 'Yes').mean() * 100)
        attrition_dept.plot(kind='bar', ax=ax, color='coral')
        ax.set_title('Attrition Rate by Department', fontsize=14, fontweight='bold')
        ax.set_ylabel('Attrition Rate (%)')
        ax.set_xlabel('Department')
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100)
        buf.seek(0)
        plots['attrition_by_dept'] = base64.b64encode(buf.read()).decode()
        plt.close()
    
    # 2. Age Distribution
    if 'age' in df.columns:
        fig, ax = plt.subplots(figsize=(10, 6))
        df['age'].hist(bins=20, ax=ax, color='skyblue', alpha=0.7)
        ax.set_title('Age Distribution', fontsize=14, fontweight='bold')
        ax.set_xlabel('Age')
        ax.set_ylabel('Frequency')
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100)
        buf.seek(0)
        plots['age_distribution'] = base64.b64encode(buf.read()).decode()
        plt.close()
    
    # 3. Monthly Income vs Attrition
    if 'monthly_income' in df.columns and 'attrition' in df.columns:
        fig, ax = plt.subplots(figsize=(12, 6))
        sns.boxplot(data=df, x='attrition', y='monthly_income', ax=ax)
        ax.set_title('Monthly Income vs Attrition', fontsize=14, fontweight='bold')
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100)
        buf.seek(0)
        plots['income_vs_attrition'] = base64.b64encode(buf.read()).decode()
        plt.close()
    
    # 4. Job Satisfaction vs Attrition
    if 'job_satisfaction' in df.columns and 'attrition' in df.columns:
        fig, ax = plt.subplots(figsize=(10, 6))
        satisfaction_attrition = df.groupby('job_satisfaction')['attrition'].apply(lambda x: (x == 'Yes').mean() * 100)
        satisfaction_attrition.plot(kind='bar', ax=ax, color='lightgreen')
        ax.set_title('Attrition Rate by Job Satisfaction Level', fontsize=14, fontweight='bold')
        ax.set_ylabel('Attrition Rate (%)')
        ax.set_xlabel('Job Satisfaction (1-4)')
        plt.xticks(rotation=0)
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100)
        buf.seek(0)
        plots['satisfaction_vs_attrition'] = base64.b64encode(buf.read()).decode()
        plt.close()
    
    return plots

# API Routes
@api_router.get("/")
async def root():
    return {"message": "HR Analytics API", "version": "1.0"}

@api_router.post("/upload-data")
async def upload_hr_data(file: UploadFile = File(...)):
    """Upload HR dataset (CSV format)"""
    try:
        # Read CSV file
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Convert to Employee objects and store
        employees = []
        for _, row in df.iterrows():
            # Convert row to dict and handle NaN values
            employee_data = row.to_dict()
            
            # Replace NaN with None
            for key, value in employee_data.items():
                if pd.isna(value):
                    employee_data[key] = None
                elif key in ['employee_id']:
                    employee_data[key] = str(value) if value is not None else None
            
            # Create employee object
            employee = Employee(**employee_data)
            employees.append(employee.dict())
        
        # Store in MongoDB
        if employees:
            await db.employees.insert_many(employees)
        
        return {
            "message": f"Successfully uploaded {len(employees)} employee records",
            "total_records": len(employees)
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

@api_router.get("/load-sample-data")
async def load_sample_data():
    """Load sample IBM HR dataset"""
    try:
        # Sample HR data (subset of IBM HR Analytics dataset)
        sample_data = [
            {"employee_id": "E001", "age": 35, "attrition": "No", "business_travel": "Travel_Rarely", "daily_rate": 1102, 
             "department": "Research & Development", "distance_from_home": 1, "education": 2, "education_field": "Life Sciences",
             "environment_satisfaction": 2, "gender": "Female", "hourly_rate": 94, "job_involvement": 3, "job_level": 2,
             "job_role": "Laboratory Technician", "job_satisfaction": 4, "marital_status": "Single", "monthly_income": 5993,
             "monthly_rate": 19479, "num_companies_worked": 8, "over_18": "Y", "over_time": "Yes", "percent_salary_hike": 11,
             "performance_rating": 3, "relationship_satisfaction": 1, "standard_hours": 80, "stock_option_level": 0,
             "total_working_years": 8, "training_times_last_year": 0, "work_life_balance": 1, "years_at_company": 6,
             "years_in_current_role": 4, "years_since_last_promotion": 0, "years_with_curr_manager": 5},
            
            {"employee_id": "E002", "age": 49, "attrition": "No", "business_travel": "Travel_Frequently", "daily_rate": 279,
             "department": "Research & Development", "distance_from_home": 8, "education": 1, "education_field": "Life Sciences",
             "environment_satisfaction": 3, "gender": "Male", "hourly_rate": 61, "job_involvement": 2, "job_level": 2,
             "job_role": "Healthcare Representative", "job_satisfaction": 2, "marital_status": "Married", "monthly_income": 5130,
             "monthly_rate": 24907, "num_companies_worked": 1, "over_18": "Y", "over_time": "No", "percent_salary_hike": 23,
             "performance_rating": 4, "relationship_satisfaction": 4, "standard_hours": 80, "stock_option_level": 1,
             "total_working_years": 10, "training_times_last_year": 3, "work_life_balance": 3, "years_at_company": 10,
             "years_in_current_role": 7, "years_since_last_promotion": 1, "years_with_curr_manager": 7},
             
            {"employee_id": "E003", "age": 37, "attrition": "Yes", "business_travel": "Travel_Rarely", "daily_rate": 1373,
             "department": "Research & Development", "distance_from_home": 2, "education": 2, "education_field": "Other",
             "environment_satisfaction": 4, "gender": "Male", "hourly_rate": 92, "job_involvement": 2, "job_level": 1,
             "job_role": "Laboratory Technician", "job_satisfaction": 3, "marital_status": "Single", "monthly_income": 2090,
             "monthly_rate": 2396, "num_companies_worked": 6, "over_18": "Y", "over_time": "Yes", "percent_salary_hike": 15,
             "performance_rating": 3, "relationship_satisfaction": 2, "standard_hours": 80, "stock_option_level": 0,
             "total_working_years": 7, "training_times_last_year": 3, "work_life_balance": 3, "years_at_company": 0,
             "years_in_current_role": 0, "years_since_last_promotion": 0, "years_with_curr_manager": 0}
        ]
        
        # Create Employee objects
        employees = []
        for data in sample_data:
            employee = Employee(**data)
            employees.append(employee.dict())
        
        # Store in MongoDB
        if employees:
            # Clear existing data
            await db.employees.delete_many({})
            await db.employees.insert_many(employees)
        
        return {
            "message": f"Successfully loaded {len(employees)} sample employee records",
            "total_records": len(employees)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading sample data: {str(e)}")

@api_router.get("/analytics")
async def get_analytics():
    """Get comprehensive analytics dashboard data"""
    try:
        # Fetch all employees
        employees = await db.employees.find().to_list(length=None)
        
        if not employees:
            raise HTTPException(status_code=404, detail="No employee data found. Please upload data first.")
        
        # Convert to DataFrame
        df = pd.DataFrame(employees)
        
        # Basic statistics
        total_employees = len(df)
        attrition_count = len(df[df['attrition'] == 'Yes']) if 'attrition' in df.columns else 0
        attrition_rate = (attrition_count / total_employees * 100) if total_employees > 0 else 0
        
        # Department-wise analysis
        dept_analysis = {}
        if 'department' in df.columns and 'attrition' in df.columns:
            dept_stats = df.groupby('department').agg({
                'attrition': ['count', lambda x: (x == 'Yes').sum()]
            }).round(2)
            dept_stats.columns = ['total', 'attrition_count']
            dept_stats['attrition_rate'] = (dept_stats['attrition_count'] / dept_stats['total'] * 100).round(2)
            dept_analysis = dept_stats.to_dict('index')
        
        # Salary analysis
        salary_stats = {}
        if 'monthly_income' in df.columns:
            salary_stats = {
                'avg_salary': float(df['monthly_income'].mean()),
                'median_salary': float(df['monthly_income'].median()),
                'min_salary': float(df['monthly_income'].min()),
                'max_salary': float(df['monthly_income'].max())
            }
            
            if 'attrition' in df.columns:
                salary_by_attrition = df.groupby('attrition')['monthly_income'].mean()
                salary_stats['avg_salary_by_attrition'] = {k: float(v) for k, v in salary_by_attrition.items()}
        
        # Age analysis
        age_stats = {}
        if 'age' in df.columns:
            age_stats = {
                'avg_age': float(df['age'].mean()),
                'median_age': float(df['age'].median()),
                'age_range': [int(df['age'].min()), int(df['age'].max())]
            }
        
        # Generate plots
        plots = generate_plots(df)
        
        # Prepare data summary for AI insights
        data_summary = {
            'total_employees': total_employees,
            'attrition_rate': round(attrition_rate, 2),
            'department_analysis': dept_analysis,
            'salary_stats': salary_stats,
            'age_stats': age_stats,
            'key_metrics': {
                'avg_tenure': df['years_at_company'].mean() if 'years_at_company' in df.columns else None,
                'avg_satisfaction': df['job_satisfaction'].mean() if 'job_satisfaction' in df.columns else None,
                'overtime_percentage': (df['over_time'] == 'Yes').mean() * 100 if 'over_time' in df.columns else None
            }
        }
        
        return {
            "summary": {
                "total_employees": total_employees,
                "attrition_count": attrition_count,
                "attrition_rate": round(attrition_rate, 2),
                "departments": list(dept_analysis.keys()) if dept_analysis else []
            },
            "department_analysis": dept_analysis,
            "salary_analysis": salary_stats,
            "age_analysis": age_stats,
            "plots": plots,
            "data_summary": data_summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating analytics: {str(e)}")

@api_router.post("/train-model")
async def train_attrition_model():
    """Train machine learning model for attrition prediction"""
    try:
        # Fetch all employees
        employees = await db.employees.find().to_list(length=None)
        
        if not employees:
            raise HTTPException(status_code=404, detail="No employee data found. Please upload data first.")
        
        # Convert to DataFrame
        df = pd.DataFrame(employees)
        
        if 'attrition' not in df.columns:
            raise HTTPException(status_code=400, detail="Attrition column not found in data")
        
        # Prepare data for ML
        df_ml, le_dict = prepare_data_for_ml(df)
        
        # Select features (exclude non-predictive columns)
        exclude_cols = ['id', 'employee_id', 'uploaded_at', 'attrition']
        feature_cols = [col for col in df_ml.columns if col not in exclude_cols]
        
        X = df_ml[feature_cols]
        y = df_ml['attrition']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train Random Forest model
        rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
        rf_model.fit(X_train, y_train)
        
        # Make predictions
        y_pred = rf_model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Feature importance
        feature_importance = list(zip(feature_cols, rf_model.feature_importances_))
        feature_importance.sort(key=lambda x: x[1], reverse=True)
        
        # Store model metadata
        model_data = {
            'id': str(uuid.uuid4()),
            'model_type': 'RandomForestClassifier',
            'accuracy': accuracy,
            'feature_columns': feature_cols,
            'label_encoders': {k: v.classes_.tolist() for k, v in le_dict.items()},
            'feature_importance': feature_importance[:10],  # Top 10 features
            'trained_at': datetime.now(timezone.utc),
            'total_samples': len(df)
        }
        
        # Store model info in MongoDB
        await db.models.delete_many({})  # Keep only latest model
        await db.models.insert_one(model_data)
        
        return {
            "message": "Model trained successfully",
            "accuracy": round(accuracy, 4),
            "total_samples": len(df),
            "test_samples": len(X_test),
            "top_features": feature_importance[:10]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error training model: {str(e)}")

@api_router.post("/predict-attrition")
async def predict_attrition(request: PredictionRequest):
    """Predict attrition for a single employee"""
    try:
        # Get the latest trained model info
        model_info = await db.models.find_one(sort=[('trained_at', -1)])
        
        if not model_info:
            raise HTTPException(status_code=404, detail="No trained model found. Please train a model first.")
        
        # Get sample of training data to retrain model (simplified approach)
        employees = await db.employees.find().to_list(length=None)
        df = pd.DataFrame(employees)
        
        # Prepare data and retrain model (in production, you'd save and load the actual model)
        df_ml, le_dict = prepare_data_for_ml(df)
        exclude_cols = ['id', 'employee_id', 'uploaded_at', 'attrition']
        feature_cols = [col for col in df_ml.columns if col not in exclude_cols]
        
        X = df_ml[feature_cols]
        y = df_ml['attrition']
        
        # Train model
        rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
        rf_model.fit(X, y)
        
        # Prepare input data
        input_data = request.employee_data.copy()
        
        # Encode categorical variables using stored encoders
        for col, encoder_classes in model_info['label_encoders'].items():
            if col in input_data:
                if str(input_data[col]) in encoder_classes:
                    input_data[col] = encoder_classes.index(str(input_data[col]))
                else:
                    input_data[col] = 0  # Default value for unknown categories
        
        # Create feature vector
        feature_vector = []
        for col in feature_cols:
            if col in input_data:
                feature_vector.append(input_data[col])
            else:
                feature_vector.append(0)  # Default value for missing features
        
        # Make prediction
        prediction_proba = rf_model.predict_proba([feature_vector])[0]
        attrition_probability = prediction_proba[1]  # Probability of attrition (Yes)
        
        # Determine risk level
        if attrition_probability >= 0.7:
            risk_level = "High"
        elif attrition_probability >= 0.4:
            risk_level = "Medium"
        else:
            risk_level = "Low"
        
        # Get feature importance for this prediction
        feature_importance = list(zip(feature_cols, rf_model.feature_importances_))
        feature_importance.sort(key=lambda x: x[1], reverse=True)
        
        top_factors = [
            {"factor": factor, "importance": round(importance, 4)}
            for factor, importance in feature_importance[:5]
        ]
        
        return PredictionResponse(
            attrition_probability=round(attrition_probability, 4),
            risk_level=risk_level,
            factors=top_factors
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error making prediction: {str(e)}")

@api_router.post("/ai-insights")
async def get_ai_insights(request: InsightsRequest):
    """Get AI-powered insights about HR data"""
    try:
        insights = await get_llm_insights(
            data_summary=request.data_summary,
            question=request.question
        )
        
        return {"insights": insights}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting AI insights: {str(e)}")

@api_router.get("/employees")
async def get_employees(
    department: Optional[str] = Query(None),
    attrition: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000)
):
    """Get employees with optional filters"""
    try:
        # Build filter query
        filter_query = {}
        if department:
            filter_query['department'] = department
        if attrition:
            filter_query['attrition'] = attrition
        
        # Fetch employees
        employees = await db.employees.find(filter_query).limit(limit).to_list(length=None)
        
        # Convert ObjectId to string and remove MongoDB _id
        for emp in employees:
            if '_id' in emp:
                del emp['_id']
        
        return {
            "employees": employees,
            "total": len(employees),
            "filters": {
                "department": department,
                "attrition": attrition
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching employees: {str(e)}")

@api_router.get("/departments")
async def get_departments():
    """Get list of unique departments"""
    try:
        departments = await db.employees.distinct("department")
        return {"departments": departments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching departments: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)