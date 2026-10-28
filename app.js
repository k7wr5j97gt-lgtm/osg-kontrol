(() => {
  const $ = id => document.getElementById(id);
  const fields = ["production", "expiry", "night", "customPercent"];
  const dateMs = s => {
    if (!s) return NaN;
    const [y,m,d] = s.split("-").map(Number);
    return Date.UTC(y, m-1, d);
  };
  const daysBetween = (a,b) => Math.round((dateMs(b)-dateMs(a))/86400000);
  const fmt = s => s ? new Date(dateMs(s)).toLocaleDateString("ru-RU",{day:"2-digit",month:"long",year:"numeric",timeZone:"UTC"}) : "—";
  const selectedPct = () => {
    const custom = $("customPercent").value.trim();
    if (custom !== "") return Number(custom);
    return Number(document.querySelector('input[name="percent"]:checked')?.value ?? 60);
  };
  function calculate() {
    const p = $("production").value, e = $("expiry").value, n = $("night").value;
    const pct = selectedPct();
    $("threshold").textContent = Number.isFinite(pct) ? `${pct}%` : "—";
    $("error").textContent = "";
    $("decision").className = "decision warn";
    if (!p || !e || !n) {
      $("osg").textContent = "—%"; $("totalDays").textContent = "— дн.";
      $("remaining").textContent = "— дн."; $("minimum").textContent = "— дн.";
      $("removeDate").textContent = "—";
      $("resultCaption").textContent = "Заполните все три даты";
      $("decision").textContent = "Введите даты для расчёта.";
      return;
    }
    const total = daysBetween(p,e);
    // Count remaining shelf life as of the morning after the night pick.
    const remaining = daysBetween(n,e) - 1;
    if (total <= 0) {
      $("error").textContent = "Дата окончания срока годности должна быть позже даты производства.";
      $("osg").textContent = "—%"; $("totalDays").textContent = "— дн.";
      $("remaining").textContent = "— дн."; $("minimum").textContent = "— дн.";
      $("removeDate").textContent = "—"; $("resultCaption").textContent = "Проверьте даты";
      $("decision").textContent = "Невозможно рассчитать: неверный срок.";
      return;
    }
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      $("error").textContent = "Процент должен быть числом от 0 до 100.";
      $("osg").textContent = "—%"; $("totalDays").textContent = `${total} дн.`;
      $("remaining").textContent = `${remaining} дн.`; $("minimum").textContent = "— дн.";
      $("removeDate").textContent = "—"; $("resultCaption").textContent = "Проверьте процент";
      $("decision").textContent = "Укажите корректный процент ОСГ.";
      return;
    }
    if (remaining < 0) {
      $("error").textContent = "Дата ночной сборки слишком поздняя: срок уже закончился к утру отгрузки.";
    }
    const minimum = Math.ceil(total * pct / 100);
    const ratio = Math.max(0, Math.min(100, remaining / total * 100));
    // Latest morning dispatch date that meets the threshold is expiry - minimum days.
    // Since picking happens the previous night, remove from shelf by that night.
    const removeMs = dateMs(e) - minimum * 86400000;
    const removeISO = new Date(removeMs).toISOString().slice(0,10);
    $("osg").textContent = `${(Math.round(ratio*10)/10).toLocaleString("ru-RU")}%`;
    $("totalDays").textContent = `${total} дн.`;
    $("remaining").textContent = `${remaining} дн.`;
    $("minimum").textContent = `${minimum} дн.`;
    $("resultCaption").textContent = "Расчётный остаток срока годности";
    $("removeDate").textContent = fmt(removeISO);
    const nightMs = dateMs(n);
    if (remaining < minimum || nightMs >= removeMs) {
      $("decision").className = "decision danger";
      $("decision").innerHTML = 'СНЯТЬ С ВИТРИНЫ<small>Снять сегодня ночью или раньше, чтобы товар не попал в утренний заказ с ОСГ ниже выбранного порога.</small>';
    } else {
      $("decision").className = "decision safe";
      $("decision").innerHTML = 'ПОКА МОЖНО ОСТАВИТЬ<small>По выбранному порогу дата снятия ещё не наступила. Повторно проверьте перед следующей ночной сборкой.</small>';
    }
  }
  fields.forEach(id => $(id).addEventListener("input", calculate));
  document.querySelectorAll('input[name="percent"]').forEach(el => el.addEventListener("change", () => {
    if ($("customPercent").value.trim() === "") calculate();
  }));
  $("reset").addEventListener("click", () => {
    fields.forEach(id => $(id).value = "");
    calculate();
  });
  // Default dates: today for the night, production and expiry left empty to avoid misleading sample results.
  const today = new Date();
  const iso = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())).toISOString().slice(0,10);
  $("night").value = iso;
  calculate();
})();