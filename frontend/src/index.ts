import { WebsocketTimeService } from "./connection";

export async function run(elem: HTMLElement) {
  console.log("Connecting!");
  const connection = new WebsocketTimeService(
    `ws${window.location.protocol === "https:" ? "s" : ""}://${
      window.location.hostname
    }${window.location.port ? ":" + window.location.port : ""}/socket`
  );

  await connection.open();
  console.log("Connected!");

  let correctionEnabled = false;

  async function getDelayLoop() {
    const delay = await connection.getDelay();

    elem.innerHTML = `Offset: ${delay.offset}ms<br/>Latency: ${
      delay.latency
    }ms<br/>Click to toggle correction (Currently ${
      correctionEnabled ? "on" : "off"
    })`;

    setTimeout(getDelayLoop, 500);
  }

  elem.addEventListener("click", () => {
    correctionEnabled = !correctionEnabled;
  });

  function paintNextColor() {
    const now = correctionEnabled ? connection.getNow() : new Date();

    elem.style.backgroundColor = colors[now.getSeconds() % 8];

    setTimeout(paintNextColor, 1000 - now.getMilliseconds());
  }

  paintNextColor();

  getDelayLoop();
}

const colors = [
  "#AAAAAA",
  "#0000FF",
  "#00FF00",
  "#00FFFF",
  "#FF0000",
  "#FF00FF",
  "#FFFF00",
  "#FFFFFF"
];
