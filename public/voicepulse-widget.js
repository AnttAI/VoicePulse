(function () {
  var SCRIPT_ATTR = "data-voicepulse-widget";
  var script =
    document.currentScript ||
    Array.prototype.slice
      .call(document.getElementsByTagName("script"))
      .find(function (s) {
        return s.src && s.src.indexOf("voicepulse-widget.js") !== -1;
      });

  if (!script) return;

  var dataset = script.dataset || {};
  var host = dataset.host;
  if (!host) {
    try {
      host = new URL(script.src).origin;
    } catch (e) {
      host = "";
    }
  }

  var agentConfig = dataset.agentConfig || "chatSupervisor";
  var agentName = dataset.agentName || "";
  var title = dataset.title || "Voice Assistant";
  var position = dataset.position || "bottom-right";
  var width = dataset.width || "360";
  var height = dataset.height || "520";
  var buttonLabel = dataset.buttonLabel || "Talk to us";

  var containerId = "voicepulse-widget";
  if (document.getElementById(containerId)) return;

  var container = document.createElement("div");
  container.id = containerId;
  container.setAttribute(SCRIPT_ATTR, "true");
  document.body.appendChild(container);

  var style = document.createElement("style");
  style.textContent =
    "#voicepulse-widget{position:fixed;z-index:999999;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif}" +
    "#voicepulse-widget.vp-bottom-right{right:20px;bottom:20px}" +
    "#voicepulse-widget.vp-bottom-left{left:20px;bottom:20px}" +
    "#voicepulse-widget .vp-launcher{background:#111;color:#fff;border:0;border-radius:999px;padding:10px 16px;cursor:pointer;font-size:14px;box-shadow:0 10px 30px rgba(0,0,0,.2)}" +
    "#voicepulse-widget .vp-panel{position:fixed;bottom:70px;right:20px;width:" +
    width +
    "px;height:" +
    height +
    "px;border-radius:16px;overflow:hidden;background:#fff;border:1px solid rgba(0,0,0,.08);box-shadow:0 20px 60px rgba(0,0,0,.25);display:none}" +
    "#voicepulse-widget.vp-bottom-left .vp-panel{left:20px;right:auto}" +
    "#voicepulse-widget .vp-panel.vp-open{display:block}" +
    "#voicepulse-widget .vp-panel-header{height:36px;background:#0b0b0b;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 10px;font-size:12px}" +
    "#voicepulse-widget .vp-close{background:transparent;border:0;color:#fff;cursor:pointer;font-size:16px;line-height:1}" +
    "#voicepulse-widget iframe{width:100%;height:calc(100% - 36px);border:0}";
  document.head.appendChild(style);

  var launcher = document.createElement("button");
  launcher.className = "vp-launcher";
  launcher.textContent = buttonLabel;

  var panel = document.createElement("div");
  panel.className = "vp-panel";

  var header = document.createElement("div");
  header.className = "vp-panel-header";
  header.innerHTML =
    '<div>' +
    title +
    '</div><button class="vp-close" aria-label="Close">×</button>';

  var iframe = document.createElement("iframe");
  iframe.allow = "microphone; autoplay";
  iframe.title = "Voice agent";
  var widgetUrl =
    host +
    "/widget?agentConfig=" +
    encodeURIComponent(agentConfig) +
    "&title=" +
    encodeURIComponent(title);
  if (agentName) {
    widgetUrl += "&agentName=" + encodeURIComponent(agentName);
  }
  iframe.src = widgetUrl;

  panel.appendChild(header);
  panel.appendChild(iframe);

  container.appendChild(launcher);
  container.appendChild(panel);

  var posClass = position === "bottom-left" ? "vp-bottom-left" : "vp-bottom-right";
  container.className = posClass;

  function openPanel() {
    panel.classList.add("vp-open");
  }

  function closePanel() {
    panel.classList.remove("vp-open");
    try {
      iframe.contentWindow &&
        iframe.contentWindow.postMessage({ type: "voicepulse.disconnect" }, "*");
    } catch (e) {
      // best-effort
    }
  }

  launcher.addEventListener("click", function () {
    if (panel.classList.contains("vp-open")) {
      closePanel();
      return;
    }
    openPanel();
    try {
      iframe.contentWindow &&
        iframe.contentWindow.postMessage({ type: "voicepulse.connect" }, "*");
    } catch (e) {
      // best-effort
    }
  });

  header.querySelector(".vp-close").addEventListener("click", closePanel);
})();
