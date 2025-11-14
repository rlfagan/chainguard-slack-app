// Simple in-memory datastore for tracking image requests
// In production, you would use a proper database like PostgreSQL, MongoDB, etc.

class DataStore {
  constructor() {
    this.requests = new Map();
  }

  /**
   * Create a new image request
   * @param {Object} request - The request details
   */
  createRequest(request) {
    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const requestData = {
      id,
      ...request,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.requests.set(id, requestData);
    return requestData;
  }

  /**
   * Get a request by ID
   * @param {string} id - The request ID
   */
  getRequest(id) {
    return this.requests.get(id);
  }

  /**
   * Update a request
   * @param {string} id - The request ID
   * @param {Object} updates - The fields to update
   */
  updateRequest(id, updates) {
    const request = this.requests.get(id);
    if (!request) {
      return null;
    }

    const updatedRequest = {
      ...request,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.requests.set(id, updatedRequest);
    return updatedRequest;
  }

  /**
   * Get all requests
   */
  getAllRequests() {
    return Array.from(this.requests.values());
  }

  /**
   * Get requests by status
   * @param {string} status - The status to filter by
   */
  getRequestsByStatus(status) {
    return Array.from(this.requests.values()).filter(req => req.status === status);
  }

  /**
   * Get requests by requester
   * @param {string} userId - The user ID
   */
  getRequestsByUser(userId) {
    return Array.from(this.requests.values()).filter(req => req.requesterId === userId);
  }

  /**
   * Delete a request
   * @param {string} id - The request ID
   */
  deleteRequest(id) {
    return this.requests.delete(id);
  }
}

export default new DataStore();
