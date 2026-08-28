(() => {
  "use strict";

  const timeElement = document.querySelector("#time");
  const hoursElement = document.querySelector("#time-hours");
  const minutesElement = document.querySelector("#time-minutes");
  const secondsElement = document.querySelector("#time-seconds");
  const dateElement = document.querySelector("#date");
  const statusElement = document.querySelector("#status");

  const weekdayFormatter = new Intl.DateTimeFormat("ja-JP", { weekday: "long" });

  let wakeLock = null;
  let clockTimer = null;

  function updateClock() {
    const now = new Date();
    const [hours, minutes, seconds] = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((part) => String(part).padStart(2, "0"));
    const dateText = `${now.getMonth() + 1}月${now.getDate()}日 ${weekdayFormatter.format(now)}`;

    hoursElement.textContent = hours;
    minutesElement.textContent = minutes;
    secondsElement.textContent = seconds;
    timeElement.setAttribute("aria-label", `${hours}時${minutes}分${seconds}秒`);
    timeElement.dateTime = now.toISOString();
    dateElement.textContent = dateText;
    dateElement.dateTime = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    clearTimeout(clockTimer);
    clockTimer = window.setTimeout(updateClock, 1000 - (Date.now() % 1000) + 20);
  }

  async function requestWakeLock() {
    if (!("wakeLock" in navigator) || document.visibilityState !== "visible" || wakeLock) {
      return;
    }

    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
      });
      statusElement.textContent = "";
    } catch (error) {
      console.info("Wake Lockを取得できませんでした。", error);
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      updateClock();
      requestWakeLock();
    }
  });

  window.addEventListener("pagehide", () => {
    clearTimeout(clockTimer);
    wakeLock?.release();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.info("Service Workerを登録できませんでした。", error);
      });
    });
  }

  updateClock();
  requestWakeLock();
})();
