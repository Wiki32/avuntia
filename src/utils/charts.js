const numberFormatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

function formatDefaultNumber(value) {
  if (!Number.isFinite(value)) return "";
  return numberFormatter.format(value);
}

function prepareCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = canvas.clientWidth || canvas.offsetWidth || canvas.width;
  const displayHeight = canvas.clientHeight || canvas.offsetHeight || canvas.height;
  if (!displayWidth || !displayHeight) return null;
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, displayWidth, displayHeight);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.font = "12px Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillStyle = "#101828";
  ctx.strokeStyle = "#101828";
  return { ctx, width: displayWidth, height: displayHeight };
}

function niceNumber(range, round) {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;
  let niceFraction;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * 10 ** exponent;
}

function generateTicks(min, max, desiredCount = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) {
    const adjustment = Math.abs(min || 1);
    min -= adjustment;
    max += adjustment;
  }
  const range = niceNumber(max - min, false);
  const step = niceNumber(range / Math.max(desiredCount - 1, 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let value = niceMin; value <= niceMax + step / 2; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }
  return ticks;
}

export function renderLineChart(
  canvas,
  {
    series = [],
    labels = [],
    xLabel = "",
    yLabel = "",
    xFormatter,
    yFormatter = formatDefaultNumber
  }
) {
  if (!canvas) return;
  const prep = prepareCanvas(canvas);
  if (!prep) return;
  const values = (series ?? []).map((value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  });
  const hasData = values.length > 0;
  const effectiveLabels = labels && labels.length ? labels : values.map((_, index) => index + 1);
  const minValue = hasData ? Math.min(...values) : 0;
  const maxValue = hasData ? Math.max(...values) : 1;
  const yTicks = generateTicks(minValue, maxValue, 5);
  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];
  const yRange = yMax - yMin || 1;

  const { ctx, width, height } = prep;
  const yTickLabels = yTicks.map((tick) => String(yFormatter(tick)));
  const yTickWidth = yTickLabels.reduce((max, label) => Math.max(max, ctx.measureText(label).width), 0);
  const tickLabelPadding = 12;
  const yLabelSpace = yLabel ? 36 : 0;

  const margin = {
    top: 24,
    right: 24,
    bottom: xLabel ? 56 : 44,
    left: Math.max(64, yTickWidth + tickLabelPadding + yLabelSpace)
  };
  const plotWidth = Math.max(0, width - margin.left - margin.right);
  const plotHeight = Math.max(0, height - margin.top - margin.bottom);
  if (!plotWidth || !plotHeight) return;

  const toY = (value) => margin.top + plotHeight - ((value - yMin) / yRange) * plotHeight;
  const pointCount = Math.max(values.length, effectiveLabels.length);
  const toX = (index) => {
    if (pointCount <= 1) return margin.left + plotWidth / 2;
    return margin.left + (index / (pointCount - 1)) * plotWidth;
  };

  // Grid and axes
  ctx.strokeStyle = "#e4e7ec";
  ctx.lineWidth = 1;
  yTicks.forEach((tick) => {
    const y = toY(tick);
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + plotWidth, y);
    ctx.stroke();
    ctx.fillStyle = "#475467";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(yFormatter(tick), margin.left - tickLabelPadding, y);
  });

  ctx.strokeStyle = "#d0d5dd";
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotHeight);
  ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
  ctx.stroke();

  // X axis labels
  if (effectiveLabels.length) {
    const maxTicks = Math.min(effectiveLabels.length, 8);
    const step = Math.max(1, Math.ceil(effectiveLabels.length / maxTicks));
    ctx.fillStyle = "#475467";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < effectiveLabels.length; i += 1) {
      const isEdge = i === effectiveLabels.length - 1;
      if (i % step !== 0 && !isEdge) continue;
      const label = effectiveLabels[i];
      const text = xFormatter ? xFormatter(label, i) : label;
      const x = toX(i);
      ctx.fillText(String(text), x, margin.top + plotHeight + 8);
      ctx.strokeStyle = "#d0d5dd";
      ctx.beginPath();
      ctx.moveTo(x, margin.top + plotHeight);
      ctx.lineTo(x, margin.top + plotHeight + 6);
      ctx.stroke();
    }
  }

  if (hasData) {
    const points = values.map((value, index) => ({
      x: toX(index),
      y: toY(value)
    }));

    // Area fill
    const gradient = ctx.createLinearGradient(0, margin.top, 0, margin.top + plotHeight);
    gradient.addColorStop(0, "rgba(32, 73, 255, 0.18)");
    gradient.addColorStop(1, "rgba(32, 73, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(points[0].x, margin.top + plotHeight);
    points.forEach((point) => {
      ctx.lineTo(point.x, point.y);
    });
    ctx.lineTo(points[points.length - 1].x, margin.top + plotHeight);
    ctx.closePath();
    ctx.fill();

    // Line
    ctx.strokeStyle = "#2049ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();

    // Points
    ctx.fillStyle = "#2049ff";
    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    ctx.fillStyle = "#98a2b3";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sin datos para mostrar", margin.left + plotWidth / 2, margin.top + plotHeight / 2);
  }

  // Axis labels
  if (yLabel) {
    ctx.save();
    ctx.fillStyle = "#344054";
    ctx.translate(
      margin.left - (yTickWidth + tickLabelPadding + yLabelSpace / 2),
      margin.top + plotHeight / 2
    );
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  if (xLabel) {
    ctx.fillStyle = "#344054";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(xLabel, margin.left + plotWidth / 2, height - margin.bottom / 3);
  }
}

export function renderBarChart(canvas, { series, labels }) {
  if (!canvas) return;
  const prep = prepareCanvas(canvas);
  if (!prep) return;
  const { ctx, width, height } = prep;
  const margin = { top: 24, right: 24, bottom: 40, left: 48 };
  const plotWidth = Math.max(0, width - margin.left - margin.right);
  const plotHeight = Math.max(0, height - margin.top - margin.bottom);
  if (!plotWidth || !plotHeight) return;
  const values = (series ?? []).map((value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  });
  const hasData = values.length > 0;
  const max = hasData ? Math.max(...values) : 1;

  ctx.strokeStyle = "#d0d5dd";
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotHeight);
  ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
  ctx.stroke();

  if (!hasData) {
    ctx.fillStyle = "#98a2b3";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sin datos para mostrar", margin.left + plotWidth / 2, margin.top + plotHeight / 2);
    return;
  }

  const gap = 12;
  const barWidth = Math.max(8, (plotWidth - gap * (values.length - 1)) / values.length);
  ctx.fillStyle = "#2049ff";
  values.forEach((value, index) => {
    const x = margin.left + index * (barWidth + gap);
    const barHeight = max ? (value / max) * plotHeight : 0;
    const y = margin.top + plotHeight - barHeight;
    ctx.fillRect(x, y, barWidth, barHeight);
  });
}
