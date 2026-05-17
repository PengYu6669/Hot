// 纯工具函数 — 可在服务端或客户端调用

export type TrendPoint = {
  time: string;
  value: number;
  predicted?: boolean;
};

export function computeTrendData(
  heatScore: number,
  lifecycle: string,
): TrendPoint[] {
  const points: TrendPoint[] = [];
  const now = new Date();

  for (let i = 0; i < 6; i++) {
    const time = new Date(now.getTime() - (6 - i) * 2 * 60 * 60000);
    const timeStr = `${time.getHours().toString().padStart(2, "0")}:00`;

    let value: number;
    if (lifecycle === "emerging") {
      value = heatScore - 20 + i * 4 + Math.round((Math.random() - 0.5) * 4);
    } else if (lifecycle === "burst") {
      value = heatScore - 8 + Math.round((Math.random() - 0.5) * 6);
    } else if (lifecycle === "mature") {
      value = heatScore - 3 + Math.round((Math.random() - 0.5) * 4);
    } else {
      value = heatScore + 8 - i * 3 + Math.round((Math.random() - 0.5) * 3);
    }
    points.push({ time: timeStr, value: Math.max(0, value) });
  }

  if (points.length > 0) {
    points[points.length - 1].value = heatScore;
  }

  const predictedCount = 4;
  for (let i = 0; i < predictedCount; i++) {
    const time = new Date(now.getTime() + (i + 1) * 2 * 60 * 60000);
    const timeStr = `${time.getHours().toString().padStart(2, "0")}:00`;

    let value: number;
    if (lifecycle === "emerging") {
      value = heatScore + (i + 1) * 3 + Math.round((Math.random() - 0.3) * 3);
    } else if (lifecycle === "burst") {
      value = heatScore + (i + 1) * 1 - Math.round((Math.random() - 0.3) * 2);
    } else if (lifecycle === "mature") {
      value = heatScore - (i + 1) * 2 + Math.round((Math.random() - 0.5) * 2);
    } else {
      value = heatScore - (i + 1) * 4 + Math.round((Math.random() - 0.5) * 2);
    }
    points.push({
      time: timeStr,
      value: Math.max(0, value),
      predicted: true,
    });
  }

  return points;
}
