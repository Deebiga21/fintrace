// FinTrace Real-Time AML & Case Management WebSocket & Cross-Tab Sync Client

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Set();
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.isConnected = false;
    this.reconnectInterval = 2000;
    this.urlIndex = 0;

    // Cross-tab broadcast channel for instantaneous zero-latency multi-tab sync
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('fintrace_cases_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event && event.data) {
            this.notifyListeners(event.data, false);
          }
        };
      }
    } catch (e) {
      this.broadcastChannel = null;
    }
  }

  getWsUrls() {
    if (typeof window === 'undefined' || !window.location) {
      return ['ws://127.0.0.1:8000/ws'];
    }
    const isSecure = window.location.protocol === 'https:';
    const proto = isSecure ? 'wss://' : 'ws://';
    const hostname = window.location.hostname || '127.0.0.1';

    // Primary: direct connection to Axum on port 8000 (matches api.js API_BASE)
    // Secondary: Vite dev proxy on /ws
    return [
      `${proto}${hostname}:8000/ws`,
      `${proto}${window.location.host}/ws`
    ];
  }

  connect() {
    if (typeof window === 'undefined' || !window.location) return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const urls = this.getWsUrls();
      const wsUrl = urls[this.urlIndex % urls.length];

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        console.log('[FinTrace WS] Connected to live AML event stream:', wsUrl);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        // Setup ping keepalive every 15s to prevent timeouts
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data, true);
        } catch (e) {
          // Ignore keepalive responses
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        if (this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }
        // Try fallback URL on next reconnect attempt
        this.urlIndex++;
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnected = false;
        this.socket?.close();
      };
    } catch (err) {
      this.isConnected = false;
      this.urlIndex++;
      this.scheduleReconnect();
    }
  }

  notifyListeners(data, broadcastToTabs = false) {
    if (!data) return;

    // Broadcast across other browser tabs if originated from this socket
    if (broadcastToTabs && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(data);
      } catch (e) {}
    }

    // Call all subscribed React components
    this.listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error('[FinTrace WS] Listener error:', err);
      }
    });

    // Also dispatch custom DOM event for global application reactions
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fintrace:case-event', { detail: data }));
    }
  }

  // Publish a local event directly across tabs & local listeners
  broadcastLocalEvent(event, caseId, data = {}) {
    const payload = {
      event,
      case_id: caseId,
      timestamp: new Date().toISOString(),
      data
    };
    this.notifyListeners(payload, true);
  }

  scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, this.reconnectInterval);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    if (!this.isConnected) {
      this.connect();
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }
}

export const wsService = new WebSocketService();
