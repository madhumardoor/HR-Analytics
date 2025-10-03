import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Textarea } from "./components/ui/textarea";
import { Separator } from "./components/ui/separator";
import { Progress } from "./components/ui/progress";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Dashboard Component
const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      toast.error("Failed to fetch analytics data");
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAIInsights = async () => {
    if (!analytics) return;
    
    try {
      setInsightsLoading(true);
      const response = await axios.post(`${API}/ai-insights`, {
        data_summary: analytics.data_summary
      });
      setInsights(response.data.insights);
    } catch (error) {
      toast.error("Failed to get AI insights");
      console.error("Error getting insights:", error);
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">HR Analytics Dashboard</h1>
          <p className="text-lg text-slate-600">Employee Attrition & Retention Insights</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card data-testid="total-employees-card" className="bg-white shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Employees</CardTitle>
                  <div className="text-blue-600">👥</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{analytics.summary.total_employees}</div>
                </CardContent>
              </Card>

              <Card data-testid="attrition-count-card" className="bg-white shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Attrition Count</CardTitle>
                  <div className="text-red-600">📉</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{analytics.summary.attrition_count}</div>
                </CardContent>
              </Card>

              <Card data-testid="attrition-rate-card" className="bg-white shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Attrition Rate</CardTitle>
                  <div className="text-orange-600">⚠️</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{analytics.summary.attrition_rate}%</div>
                  <Progress value={analytics.summary.attrition_rate} className="mt-2" />
                </CardContent>
              </Card>

              <Card data-testid="departments-count-card" className="bg-white shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Departments</CardTitle>
                  <div className="text-green-600">🏢</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{analytics.summary.departments.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Analytics Tabs */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900">Detailed Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="departments" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger data-testid="departments-tab" value="departments">Departments</TabsTrigger>
                    <TabsTrigger data-testid="salary-tab" value="salary">Salary Analysis</TabsTrigger>
                    <TabsTrigger data-testid="demographics-tab" value="demographics">Demographics</TabsTrigger>
                    <TabsTrigger data-testid="visualizations-tab" value="visualizations">Charts</TabsTrigger>
                  </TabsList>

                  <TabsContent value="departments" className="mt-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900">Department-wise Analysis</h3>
                      <div className="grid gap-4">
                        {Object.entries(analytics.department_analysis || {}).map(([dept, stats]) => (
                          <Card key={dept} className="border border-slate-200">
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium text-slate-900">{dept}</h4>
                                  <p className="text-sm text-slate-600">{stats.total} employees</p>
                                </div>
                                <div className="text-right">
                                  <Badge variant={stats.attrition_rate > 15 ? "destructive" : "secondary"}>
                                    {stats.attrition_rate}% attrition
                                  </Badge>
                                  <p className="text-xs text-slate-500 mt-1">{stats.attrition_count} left</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="salary" className="mt-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900">Salary Statistics</h3>
                      {analytics.salary_analysis && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-600">Average Salary</p>
                            <p className="text-lg font-bold text-slate-900">
                              {formatCurrency(analytics.salary_analysis.avg_salary)}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-600">Median Salary</p>
                            <p className="text-lg font-bold text-slate-900">
                              {formatCurrency(analytics.salary_analysis.median_salary)}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-600">Min Salary</p>
                            <p className="text-lg font-bold text-slate-900">
                              {formatCurrency(analytics.salary_analysis.min_salary)}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-600">Max Salary</p>
                            <p className="text-lg font-bold text-slate-900">
                              {formatCurrency(analytics.salary_analysis.max_salary)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="demographics" className="mt-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900">Age Demographics</h3>
                      {analytics.age_analysis && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-600">Average Age</p>
                            <p className="text-2xl font-bold text-slate-900">
                              {Math.round(analytics.age_analysis.avg_age)} years
                            </p>
                          </div>
                          <div className="text-center p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-600">Median Age</p>
                            <p className="text-2xl font-bold text-slate-900">
                              {analytics.age_analysis.median_age} years
                            </p>
                          </div>
                          <div className="text-center p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-600">Age Range</p>
                            <p className="text-2xl font-bold text-slate-900">
                              {analytics.age_analysis.age_range[0]} - {analytics.age_analysis.age_range[1]}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="visualizations" className="mt-6">
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-slate-900">Data Visualizations</h3>
                      <div className="grid gap-6">
                        {Object.entries(analytics.plots || {}).map(([plotName, plotData]) => (
                          <div key={plotName} className="text-center">
                            <h4 className="text-md font-medium mb-2 capitalize">
                              {plotName.replace(/_/g, ' ')}
                            </h4>
                            <img 
                              src={`data:image/png;base64,${plotData}`} 
                              alt={plotName}
                              className="mx-auto rounded-lg shadow-md max-w-full h-auto"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* AI Insights Section */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  🤖 AI-Powered Insights
                </CardTitle>
                <CardDescription>
                  Get intelligent analysis and recommendations based on your HR data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!insights ? (
                  <Button 
                    data-testid="get-insights-btn"
                    onClick={getAIInsights} 
                    disabled={insightsLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {insightsLoading ? "Generating Insights..." : "Get AI Insights"}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                      <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">
                        {insights}
                      </pre>
                    </div>
                    <Button 
                      data-testid="refresh-insights-btn"
                      onClick={getAIInsights} 
                      disabled={insightsLoading}
                      variant="outline"
                      size="sm"
                    >
                      Refresh Insights
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-white shadow-lg">
            <CardContent className="text-center py-12">
              <p className="text-lg text-slate-600 mb-4">No data available. Please upload HR data first.</p>
              <Link to="/data">
                <Button data-testid="upload-data-btn" className="bg-blue-600 hover:bg-blue-700">
                  Upload Data
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Data Management Component
const DataManagement = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingsample, setLoadingSample] = useState(false);
  const navigate = useNavigate();

  const handleFileUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const response = await axios.post(`${API}/upload-data`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(response.data.message);
      navigate('/dashboard');
    } catch (error) {
      toast.error("Failed to upload file");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const loadSampleData = async () => {
    try {
      setLoadingSample(true);
      const response = await axios.get(`${API}/load-sample-data`);
      toast.success(response.data.message);
      navigate('/dashboard');
    } catch (error) {
      toast.error("Failed to load sample data");
      console.error("Sample data error:", error);
    } finally {
      setLoadingSample(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Data Management</h1>
          <p className="text-lg text-slate-600">Upload your HR dataset or use sample data</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* File Upload */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900">Upload CSV File</CardTitle>
              <CardDescription>
                Upload your HR dataset in CSV format. Should include employee information and attrition data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Select CSV File</Label>
                <Input
                  data-testid="file-input"
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="mt-1"
                />
              </div>
              <Button 
                data-testid="upload-file-btn"
                onClick={handleFileUpload}
                disabled={uploading || !file}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? "Uploading..." : "Upload File"}
              </Button>
            </CardContent>
          </Card>

          {/* Sample Data */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900">Use Sample Data</CardTitle>
              <CardDescription>
                Load IBM HR Analytics sample dataset to explore the application features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-600 space-y-2">
                <p>📊 Sample dataset includes:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Employee demographics and job information</li>
                  <li>Satisfaction and performance metrics</li>
                  <li>Salary and compensation data</li>
                  <li>Attrition indicators</li>
                </ul>
              </div>
              <Button 
                data-testid="load-sample-btn"
                onClick={loadSampleData}
                disabled={loadingSample}
                variant="outline"
                className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                {loadingSample ? "Loading..." : "Load Sample Data"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* File Format Guide */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-blue-900">CSV Format Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-800 mb-2">Your CSV file should include columns like:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-blue-700">
              <span>• employee_id</span>
              <span>• age</span>
              <span>• attrition</span>
              <span>• department</span>
              <span>• job_role</span>
              <span>• monthly_income</span>
              <span>• job_satisfaction</span>
              <span>• years_at_company</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Prediction Component
const Prediction = () => {
  const [formData, setFormData] = useState({
    age: '',
    department: '',
    job_role: '',
    monthly_income: '',
    job_satisfaction: '',
    years_at_company: '',
    over_time: '',
    work_life_balance: '',
    distance_from_home: '',
    education: ''
  });
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [modelTrained, setModelTrained] = useState(false);
  const [training, setTraining] = useState(false);

  const trainModel = async () => {
    try {
      setTraining(true);
      const response = await axios.post(`${API}/train-model`);
      toast.success("Model trained successfully!");
      setModelTrained(true);
      console.log("Training result:", response.data);
    } catch (error) {
      toast.error("Failed to train model. Please upload data first.");
      console.error("Training error:", error);
    } finally {
      setTraining(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const predictAttrition = async () => {
    try {
      setPredicting(true);
      
      // Convert form data to proper types
      const employeeData = {
        age: parseInt(formData.age) || 0,
        department: formData.department,
        job_role: formData.job_role,
        monthly_income: parseInt(formData.monthly_income) || 0,
        job_satisfaction: parseInt(formData.job_satisfaction) || 1,
        years_at_company: parseInt(formData.years_at_company) || 0,
        over_time: formData.over_time,
        work_life_balance: parseInt(formData.work_life_balance) || 1,
        distance_from_home: parseInt(formData.distance_from_home) || 0,
        education: parseInt(formData.education) || 1
      };
      
      const response = await axios.post(`${API}/predict-attrition`, {
        employee_data: employeeData
      });
      
      setPrediction(response.data);
    } catch (error) {
      toast.error("Failed to make prediction. Please train model first.");
      console.error("Prediction error:", error);
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Attrition Prediction</h1>
          <p className="text-lg text-slate-600">Predict employee attrition risk using machine learning</p>
        </div>

        {/* Model Training Section */}
        <Card className="mb-6 bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900">Model Training</CardTitle>
            <CardDescription>
              Train the machine learning model before making predictions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              data-testid="train-model-btn"
              onClick={trainModel}
              disabled={training}
              className="bg-green-600 hover:bg-green-700"
            >
              {training ? "Training Model..." : "Train Model"}
            </Button>
            {modelTrained && (
              <Badge className="ml-2" variant="success">Model Ready</Badge>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Form */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900">Employee Information</CardTitle>
              <CardDescription>
                Enter employee details to predict attrition risk
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    data-testid="age-input"
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    placeholder="30"
                  />
                </div>
                <div>
                  <Label htmlFor="monthly_income">Monthly Income</Label>
                  <Input
                    data-testid="income-input"
                    id="monthly_income"
                    type="number"
                    value={formData.monthly_income}
                    onChange={(e) => handleInputChange('monthly_income', e.target.value)}
                    placeholder="5000"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <Select onValueChange={(value) => handleInputChange('department', value)}>
                  <SelectTrigger data-testid="department-select">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Research & Development">Research & Development</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Human Resources">Human Resources</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="job_role">Job Role</Label>
                <Select onValueChange={(value) => handleInputChange('job_role', value)}>
                  <SelectTrigger data-testid="job-role-select">
                    <SelectValue placeholder="Select job role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laboratory Technician">Laboratory Technician</SelectItem>
                    <SelectItem value="Healthcare Representative">Healthcare Representative</SelectItem>
                    <SelectItem value="Sales Executive">Sales Executive</SelectItem>
                    <SelectItem value="Research Scientist">Research Scientist</SelectItem>
                    <SelectItem value="Manufacturing Director">Manufacturing Director</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="job_satisfaction">Job Satisfaction (1-4)</Label>
                  <Select onValueChange={(value) => handleInputChange('job_satisfaction', value)}>
                    <SelectTrigger data-testid="satisfaction-select">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Low</SelectItem>
                      <SelectItem value="2">2 - Medium</SelectItem>
                      <SelectItem value="3">3 - High</SelectItem>
                      <SelectItem value="4">4 - Very High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="work_life_balance">Work Life Balance (1-4)</Label>
                  <Select onValueChange={(value) => handleInputChange('work_life_balance', value)}>
                    <SelectTrigger data-testid="balance-select">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Bad</SelectItem>
                      <SelectItem value="2">2 - Good</SelectItem>
                      <SelectItem value="3">3 - Better</SelectItem>
                      <SelectItem value="4">4 - Best</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="years_at_company">Years at Company</Label>
                  <Input
                    data-testid="years-input"
                    id="years_at_company"
                    type="number"
                    value={formData.years_at_company}
                    onChange={(e) => handleInputChange('years_at_company', e.target.value)}
                    placeholder="5"
                  />
                </div>
                <div>
                  <Label htmlFor="distance_from_home">Distance from Home</Label>
                  <Input
                    data-testid="distance-input"
                    id="distance_from_home"
                    type="number"
                    value={formData.distance_from_home}
                    onChange={(e) => handleInputChange('distance_from_home', e.target.value)}
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="over_time">Overtime</Label>
                <Select onValueChange={(value) => handleInputChange('over_time', value)}>
                  <SelectTrigger data-testid="overtime-select">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                data-testid="predict-btn"
                onClick={predictAttrition}
                disabled={predicting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {predicting ? "Predicting..." : "Predict Attrition Risk"}
              </Button>
            </CardContent>
          </Card>

          {/* Prediction Results */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900">Prediction Results</CardTitle>
            </CardHeader>
            <CardContent>
              {prediction ? (
                <div className="space-y-4">
                  {/* Risk Level */}
                  <div className="text-center p-6 rounded-lg bg-gradient-to-r from-slate-50 to-blue-50">
                    <h3 className="text-lg font-semibold mb-2">Attrition Risk Level</h3>
                    <Badge 
                      data-testid="risk-level-badge"
                      className={`text-lg py-2 px-4 ${
                        prediction.risk_level === 'High' ? 'bg-red-500' :
                        prediction.risk_level === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                    >
                      {prediction.risk_level} Risk
                    </Badge>
                    <p className="text-2xl font-bold mt-2" data-testid="probability-display">
                      {(prediction.attrition_probability * 100).toFixed(1)}% probability
                    </p>
                  </div>

                  <Separator />

                  {/* Top Factors */}
                  <div>
                    <h4 className="font-semibold mb-2">Top Risk Factors</h4>
                    <div className="space-y-2">
                      {prediction.factors.map((factor, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                          <span className="text-sm">{factor.factor}</span>
                          <span className="text-sm font-medium">
                            {(factor.importance * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p>Fill in the employee information and click "Predict" to see results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Navigation Header
const Navigation = () => {
  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-slate-900">
              HR Analytics
            </Link>
            <div className="flex space-x-6">
              <Link 
                to="/dashboard" 
                data-testid="dashboard-nav-link"
                className="text-slate-600 hover:text-blue-600 font-medium transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                to="/data" 
                data-testid="data-nav-link"
                className="text-slate-600 hover:text-blue-600 font-medium transition-colors"
              >
                Data Management
              </Link>
              <Link 
                to="/prediction" 
                data-testid="prediction-nav-link"
                className="text-slate-600 hover:text-blue-600 font-medium transition-colors"
              >
                Predictions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Home Page
const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            HR Analytics Platform
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Leverage AI and machine learning to identify attrition drivers, improve retention strategies, 
            and make data-driven HR decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dashboard">
              <Button data-testid="get-started-btn" size="lg" className="bg-blue-600 hover:bg-blue-700 px-8 py-3">
                Get Started
              </Button>
            </Link>
            <Link to="/data">
              <Button data-testid="upload-data-nav-btn" variant="outline" size="lg" className="px-8 py-3">
                Upload Data
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <CardTitle>Data Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-center">
                Comprehensive analysis of employee attrition patterns, department trends, and salary correlations
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="text-4xl mb-4">🤖</div>
              <CardTitle>AI Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-center">
                Machine learning models to predict individual employee attrition risk and identify key factors
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="text-4xl mb-4">💡</div>
              <CardTitle>Smart Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-center">
                AI-powered recommendations for retention strategies and actionable HR policy improvements
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Navigation />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/data" element={<DataManagement />} />
              <Route path="/prediction" element={<Prediction />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;