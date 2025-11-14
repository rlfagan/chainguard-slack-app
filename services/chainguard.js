import axios from 'axios';
import config from '../config/index.js';

class ChainguardClient {
  constructor() {
    this.apiUrl = config.chainguard.apiUrl;
    this.apiToken = config.chainguard.apiToken;
    this.orgId = config.chainguard.orgId;
    this.registry = config.chainguard.registry;

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create a custom assembly (image) request
   * @param {Object} imageRequest - The image request details
   * @param {string} imageRequest.name - Name of the custom image
   * @param {string} imageRequest.baseImage - Base image to use
   * @param {string[]} imageRequest.packages - List of packages to include
   * @param {string} imageRequest.description - Description of the image
   */
  async createCustomAssembly(imageRequest) {
    try {
      // Note: The exact API endpoint needs to be confirmed from Chainguard documentation
      // This is a placeholder based on typical REST API patterns
      // TODO: Update this endpoint based on official Chainguard API docs

      console.log('Creating custom assembly with:', imageRequest);

      // Attempt multiple possible API endpoints
      const possibleEndpoints = [
        `/iam/organizations/${this.orgId}/custom-assemblies`,
        `/registry/custom-assemblies`,
        `/v1/custom-assemblies`,
        `/assembly`
      ];

      let lastError = null;

      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const response = await this.client.post(endpoint, {
            name: imageRequest.name,
            base_image: imageRequest.baseImage,
            packages: imageRequest.packages,
            description: imageRequest.description,
            organization_id: this.orgId
          });

          console.log('Success! Response:', response.data);
          return {
            success: true,
            data: response.data
          };
        } catch (err) {
          lastError = err;
          console.log(`Endpoint ${endpoint} failed:`, err.response?.data || err.message);
          continue;
        }
      }

      throw lastError;

    } catch (error) {
      console.error('Error creating custom assembly:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: 'The Chainguard API endpoint may need to be updated. Please check the official API documentation or use chainctl for now.'
      };
    }
  }

  /**
   * List available base images
   */
  async listBaseImages() {
    try {
      const response = await this.client.get(`/iam/organizations/${this.orgId}/images`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error listing base images:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get custom assembly status
   * @param {string} assemblyId - The custom assembly ID
   */
  async getAssemblyStatus(assemblyId) {
    try {
      const response = await this.client.get(`/iam/organizations/${this.orgId}/custom-assemblies/${assemblyId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error getting assembly status:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Delete a custom assembly
   * @param {string} assemblyId - The custom assembly ID
   */
  async deleteCustomAssembly(assemblyId) {
    try {
      await this.client.delete(`/iam/organizations/${this.orgId}/custom-assemblies/${assemblyId}`);
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting assembly:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

export default new ChainguardClient();
