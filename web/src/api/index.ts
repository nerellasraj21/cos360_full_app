import axios from 'axios';

const CAxios = axios.create({
  baseURL: 'http://localhost:8000', // Change to  env later
  withCredentials: true, // shd check with backend once, After auth module is completed
});

CAxios.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname; // Current Format school1.abc.com or www.school1.abc.com
    const cleanHost = host.replace(/^www\./, "");
    const match = cleanHost.match(/^([^.]+)\./); // Regexp match subdomain
    console.log("match", match)
    if (match && match[1]) {
      config.headers = config.headers || {};
      config.headers['tenant'] = match[1];
    }
  }
  return config;
});

export default CAxios; 