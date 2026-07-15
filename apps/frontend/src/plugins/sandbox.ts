/**
 * Sandboxed Plugin Runner for CollabBoard X.
 * Spawns a secure, null-origin iframe container to execute third-party scripts.
 * Communication is strictly restricted through HTML5 postMessage.
 */
export interface PluginManifest {
  id: string;
  name: string;
  permissions: ('canvas:read' | 'canvas:write' | 'network')[];
  code: string; // The script bundle
}

export class PluginSandbox {
  private iframe: HTMLIFrameElement | null = null;
  private manifest: PluginManifest;
  private onMessageCallback: (action: string, payload: any) => void;

  constructor(manifest: PluginManifest, onMessage: (action: string, payload: any) => void) {
    this.manifest = manifest;
    this.onMessageCallback = onMessage;
  }

  /**
   * Spawns the sandbox container and injects the plugin script.
   */
  public start() {
    this.iframe = document.createElement('iframe');
    // Enforce null-origin security sandboxing (no access to parent cookies, localStorage, or DOM)
    this.iframe.setAttribute('sandbox', 'allow-scripts');
    this.iframe.style.display = 'none';

    // Build the secure message bridge template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <script>
          // Secure SDK Mock inside Sandbox
          window.parentSDK = {
            send: (action, payload) => {
              window.parent.postMessage({
                pluginId: "${this.manifest.id}",
                action,
                payload
              }, "*");
            },
            onMessage: (callback) => {
              window.addEventListener("message", (e) => {
                if (e.data && e.data.type === "parent-event") {
                  callback(e.data.action, e.data.payload);
                }
              });
            }
          };
        </script>
      </head>
      <body>
        <script>
          // Run the plugin sandbox code
          try {
            ${this.manifest.code}
          } catch(e) {
            window.parentSDK.send("error", { message: e.message });
          }
        </script>
      </body>
      </html>
    `;

    document.body.appendChild(this.iframe);

    const doc = this.iframe.contentDocument || this.iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
    }

    // Bind event bus receiver
    window.addEventListener('message', this.handleMessage);
  }

  /**
   * Destroys the container frame and unbinds event listeners.
   */
  public destroy() {
    if (this.iframe) {
      document.body.removeChild(this.iframe);
      this.iframe = null;
    }
    window.removeEventListener('message', this.handleMessage);
  }

  /**
   * Dispatches canvas events (e.g. selection change, updates) into the sandbox.
   */
  public sendEvent(action: string, payload: any) {
    this.iframe?.contentWindow?.postMessage({
      type: 'parent-event',
      action,
      payload
    }, '*');
  }

  private handleMessage = (e: MessageEvent) => {
    if (e.data && e.data.pluginId === this.manifest.id) {
      const { action, payload } = e.data;
      
      // Enforce Permission Check
      if (action === 'canvas:write' && !this.manifest.permissions.includes('canvas:write')) {
        console.warn(`Plugin ${this.manifest.id} attempted unauthorized write access.`);
        return;
      }

      this.onMessageCallback(action, payload);
    }
  };
}
