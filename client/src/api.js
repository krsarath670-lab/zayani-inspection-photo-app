const API_BASE = '/api';

// Offline storage helper for field workers
const OFFLINE_QUEUE_KEY = 'zayani_offline_queue';

export function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

export function saveToOfflineQueue(action) {
  const queue = getOfflineQueue();
  queue.push({ ...action, timestamp: new Date().toISOString() });
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('zayani_token');
  const headers = {
    ...options.headers,
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (res.status === 401) {
      // If token expired, clear token
      localStorage.removeItem('zayani_token');
      localStorage.removeItem('zayani_user');
      window.dispatchEvent(new Event('auth-expired'));
      throw new Error('Session expired. Please log in again.');
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
    }

    // Return blob if file download
    const contentType = res.headers.get('content-type');
    if (contentType && (contentType.includes('spreadsheet') || contentType.includes('pdf') || contentType.includes('word') || contentType.includes('octet-stream'))) {
      return res.blob();
    }

    return await res.json();
  } catch (err) {
    // If network error and is a mutable request, queue offline
    if (!navigator.onLine && (options.method === 'POST' || options.method === 'PUT')) {
      console.warn('Network offline, queuing request:', endpoint);
      saveToOfflineQueue({ endpoint, options: { ...options, body: typeof options.body === 'string' ? JSON.parse(options.body) : options.body } });
      return { offlineQueued: true, message: 'Saved offline. Will sync when connection is restored.' };
    }
    throw err;
  }
}

// Download helper
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// Image compression helper for mobile camera uploads
export function compressImage(file, maxDimension = 1920, quality = 0.85) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
