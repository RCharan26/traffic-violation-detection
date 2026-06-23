// ============================================================
//  API CLIENT SERVICE — TrafficVision AI
//  Handles all HTTP requests to the FastAPI backend.
// ============================================================

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Helper to get headers with Auth token
function getHeaders(isMultipart = false) {
  const headers = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  const token = localStorage.getItem('tvai_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Global fetch wrapper with auto logout on 401
async function request(url, options = {}) {
  const fullUrl = `${API_BASE_URL}${url}`;
  
  // Merge headers
  options.headers = {
    ...getHeaders(options.body instanceof FormData),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(fullUrl, options);
    
    // Handle unauthorized access
    if (response.status === 401) {
      localStorage.removeItem('tvai_token');
      localStorage.removeItem('tvai_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized session. Please login again.');
    }
    
    if (response.status === 204) {
      return null;
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || `Request failed with status ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error(`API Error [${options.method || 'GET'} ${url}]:`, error);
    throw error;
  }
}

export const api = {
  // ── Authentication ──────────────────────────────────────────
  async login(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Login failed. Invalid credentials.');
    }

    localStorage.setItem('tvai_token', data.access_token);
    const user = { username: data.username, name: data.name };
    localStorage.setItem('tvai_user', JSON.stringify(user));
    return user;
  },

  logout() {
    localStorage.removeItem('tvai_token');
    localStorage.removeItem('tvai_user');
    window.location.href = '/login';
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('tvai_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem('tvai_token');
  },

  // ── Image Upload & Processing ───────────────────────────────
  async uploadImage(file, locationLabel = '') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('location_label', locationLabel);

    return request('/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async runDetection(imageId) {
    return request(`/detect/${imageId}`, {
      method: 'POST',
    });
  },

  // ── Violations Management ────────────────────────────────────
  async getViolations(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    if (params.violation_type && params.violation_type !== 'all') {
      query.append('violation_type', params.violation_type);
    }
    if (params.severity && params.severity !== 'all') {
      query.append('severity', params.severity);
    }
    if (params.status && params.status !== 'all') {
      query.append('status', params.status);
    }
    if (params.license_plate) {
      query.append('license_plate', params.license_plate);
    }
    if (params.image_id) {
      query.append('image_id', params.image_id);
    }

    return request(`/violations?${query.toString()}`);
  },

  async getViolation(violationId) {
    return request(`/violations/${violationId}`);
  },

  async updateViolationStatus(violationId, status) {
    return request(`/violations/${violationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async deleteViolation(violationId) {
    return request(`/violations/${violationId}`, {
      method: 'DELETE',
    });
  },

  // ── Analytics ───────────────────────────────────────────────
  async getAnalytics() {
    return request('/analytics');
  },

  // ── History Log ─────────────────────────────────────────────
  async getHistory(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    if (params.status && params.status !== 'all') {
      query.append('status', params.status);
    }
    if (params.location_label) {
      query.append('location_label', params.location_label);
    }

    return request(`/history?${query.toString()}`);
  },

  async deleteHistoryRecord(imageId) {
    return request(`/history/${imageId}`, {
      method: 'DELETE',
    });
  },

  // ── Multi-Parameter Search ──────────────────────────────────
  async search(searchParams = {}) {
    return request('/search', {
      method: 'POST',
      body: JSON.stringify({
        query: searchParams.query || null,
        violation_type: searchParams.violation_type && searchParams.violation_type !== 'all' ? searchParams.violation_type : null,
        severity: searchParams.severity && searchParams.severity !== 'all' ? searchParams.severity : null,
        license_plate: searchParams.license_plate || null,
        status: searchParams.status && searchParams.status !== 'all' ? searchParams.status : null,
        date_from: searchParams.date_from || null,
        date_to: searchParams.date_to || null,
        page: searchParams.page || 1,
        page_size: searchParams.page_size || 20,
      }),
    });
  },

  // ── Report Exports ──────────────────────────────────────────
  getReportUrl(violationId) {
    const token = localStorage.getItem('tvai_token') || '';
    return `${API_BASE_URL}/reports/${violationId}?token=${token}`;
  },
  
  // Asset base endpoints for rendering images
  getUploadUrl(filename) {
    return `http://localhost:8000/uploads/${filename}`;
  },

  getEvidenceUrl(filename) {
    // If the path returned from DB is absolute, extract just the filename
    if (filename && (filename.includes('/') || filename.includes('\\'))) {
      const parts = filename.split(/[/\\]/);
      return `http://localhost:8000/evidence/${parts[parts.length - 1]}`;
    }
    return `http://localhost:8000/evidence/${filename}`;
  },

  // ── Performance Metrics & Model Status ────────────────────────
  async getPerformance() {
    return request('/performance');
  },

  async getModelStatus() {
    return request('/model-status');
  },

  async getTrainingStatus() {
    return request('/training/status');
  },

  async uploadVideo(file) {
    const formData = new FormData();
    formData.append('file', file);
    return request('/video/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async getVideoStatus(taskId) {
    return request(`/video/status/${taskId}`);
  }
};
