import "./styles.css";
import { startChat } from "./chat";

const logEl = document.querySelector<HTMLOListElement>("#log");
const buy = document.querySelector<HTMLButtonElement>("#buy");
const buyAgain = document.querySelector<HTMLButtonElement>("#buy-again");
const buyUnknown = document.querySelector<HTMLButtonElement>("#buy-unknown");
const clearLog = document.querySelector<HTMLButtonElement>("#clear-log");

if (!logEl || !buy || !buyAgain || !buyUnknown || !clearLog) {
  throw new Error("Demo markup is missing a required node.");
}

const logList = logEl;

function stamp() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function log(name: string, payload: unknown) {
  const item = document.createElement("li");
  const time = document.createElement("time");
  time.textContent = stamp();
  const label = document.createElement("strong");
  label.textContent = name;
  const body = document.createElement("code");
  body.textContent = JSON.stringify(payload);
  item.append(time, label, body);
  logList.prepend(item);
}

function openCheckout(productId: string) {
  if (!window.EmbdCheckout) {
    log("sdk.missing", {
      message: "embd-checkout.js did not load. Run npm run dev from the repo root.",
    });
    return;
  }

  window.EmbdCheckout.open({
    productId,
    onSuccess: (event) => log("onSuccess", event),
    onClose: (event) => log("onClose", event),
    onError: (event) => log("onError", event),
  });
}

buy.addEventListener("click", () => {
  openCheckout("prod_demo_lifetime");
});

buyAgain.addEventListener("click", () => {
  openCheckout("prod_demo_lifetime");
});

buyUnknown.addEventListener("click", () => {
  openCheckout("prod_does_not_exist");
});

clearLog.addEventListener("click", () => {
  logList.replaceChildren();
});

const stream = document.querySelector<HTMLElement>("#chat-stream");
if (stream) startChat(stream);
