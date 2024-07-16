"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  ComposedChart,
  Bar,
  Cell,
  Line,
  ErrorBar,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

interface CandleStickProps {
  chartData: any[];
  chartConfig: any;
  height: number;
  colorUp?: string;
  colorDown?: string;
  barWidth?: number;
  lineWidth?: number;
}

export const Candlestick: React.FC<CandleStickProps> = ({
  chartData,
  chartConfig,
  height,
  colorUp = "#00906F",
  colorDown = "#B23507",
  barWidth = 8,
  lineWidth = 4,
}) => {
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState(chartData);
  const [isSelecting, setIsSelecting] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const zoomedData = useMemo(() => {
    if (!startTime || !endTime) {
      return chartData;
    }

    const dataPointsInRange = originalData.filter(
      (dataPoint) => dataPoint.date >= startTime && dataPoint.date <= endTime
    );

    return dataPointsInRange.length > 1
      ? dataPointsInRange
      : originalData.slice(0, 2);
  }, [startTime, endTime, originalData, chartData]);

  const handleMouseDown = (e: any) => {
    if (e.activeLabel) {
      setRefAreaLeft(e.activeLabel);
      setIsSelecting(true);
    }
  };

  const handleMouseMove = (e: any) => {
    if (isSelecting && e.activeLabel) {
      setRefAreaRight(e.activeLabel);
    }
  };

  const handleMouseUp = () => {
    if (refAreaLeft && refAreaRight) {
      const [left, right] = [refAreaLeft, refAreaRight].sort();
      setStartTime(left);
      setEndTime(right);
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsSelecting(false);
  };

  const handleReset = () => {
    setStartTime(originalData[0].date);
    setEndTime(originalData[originalData.length - 1].date);
  };

  const handleZoom = (
    e: React.WheelEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    if (!originalData.length || !chartRef.current) return;

    let zoomFactor = 0.1;
    let direction = 0;
    let clientX = 0;

    if ("deltaY" in e) {
      direction = e.deltaY < 0 ? 1 : -1;
      clientX = e.clientX;
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );

      if ((e as any).lastTouchDistance) {
        direction = currentDistance > (e as any).lastTouchDistance ? 1 : -1;
      }
      (e as any).lastTouchDistance = currentDistance;

      clientX = (touch1.clientX + touch2.clientX) / 2;
    } else {
      return;
    }

    const currentRange =
      new Date(
        endTime || originalData[originalData.length - 1].date
      ).getTime() - new Date(startTime || originalData[0].date).getTime();
    const zoomAmount = currentRange * zoomFactor * direction;

    const chartRect = chartRef.current.getBoundingClientRect();
    const mouseX = clientX - chartRect.left;
    const chartWidth = chartRect.width;
    const mousePercentage = mouseX / chartWidth;

    const currentStartTime = new Date(
      startTime || originalData[0].date
    ).getTime();
    const currentEndTime = new Date(
      endTime || originalData[originalData.length - 1].date
    ).getTime();

    const newStartTime = new Date(
      currentStartTime + zoomAmount * mousePercentage
    );
    const newEndTime = new Date(
      currentEndTime - zoomAmount * (1 - mousePercentage)
    );

    setStartTime(newStartTime.toISOString());
    setEndTime(newEndTime.toISOString());
  };

  const formatChartData = (data: any) => {
    return data
      .map((item: any) => ({
        ...item,
        dateTime: new Date(item.date).getTime(),
      }))
      .filter((item: any) => !isNaN(item.dateTime))
      .sort((a: any, b: any) => a.dateTime - b.dateTime);
  };

  const formattedData = formatChartData(zoomedData).map((point: any) => {
    const isUp = point.close > point.open;
    return {
      date: point.date,
      low: point.low,
      high: point.high,
      bodyBottom: Math.min(point.open, point.close),
      bodyTop: Math.max(point.open, point.close),
      height: Math.abs(point.close - point.open),
      errorLineHigh:
        (point.high - Math.max(point.close, point.open)) / 2 +
        Math.max(point.close, point.open),
      errorLineLow:
        Math.min(point.close, point.open) -
        (Math.min(point.close, point.open) - point.low) / 2,
      errorLowUp: isUp
        ? (Math.min(point.close, point.open) - point.low) / 2
        : null,
      errorHighUp: isUp
        ? (point.high - Math.max(point.close, point.open)) / 2
        : null,
      errorLowDown: !isUp
        ? (Math.min(point.close, point.open) - point.low) / 2
        : null,
      errorHighDown: !isUp
        ? (point.high - Math.max(point.close, point.open)) / 2
        : null,
      up: isUp,
    };
  });

  const maxHeight = Math.max(...formattedData.map((point: any) => point.high));
  const minHeight = Math.min(...formattedData.map((point: any) => point.low));

  return (
    <ChartContainer config={chartConfig}>
      <div
        className="h-full"
        onWheel={handleZoom}
        onTouchMove={handleZoom}
        ref={chartRef}
        style={{ touchAction: "none" }}
      >
        <div className="flex justify-end my-2 sm:mb-4">
          <button
            onClick={handleReset}
            disabled={!startTime && !endTime}
            className="text-xs sm:text-sm"
          >
            Reset
          </button>
        </div>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={formattedData}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" />
            <YAxis domain={[minHeight - 2, maxHeight + 2]} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />

            <Bar dataKey="low" fillOpacity={0} stackId="stack" />
            <Bar dataKey="height" stackId="stack" barSize={barWidth}>
              {formattedData.map((entry: any, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.up ? colorUp : colorDown}
                />
              ))}
            </Bar>

            <Line
              dataKey="errorLineHigh"
              stroke="none"
              isAnimationActive={false}
              dot={false}
            >
              <ErrorBar
                dataKey="errorHighDown"
                width={lineWidth}
                strokeWidth={lineWidth - 1}
                stroke={colorDown}
              />
            </Line>
            <Line
              dataKey="errorLineLow"
              stroke="none"
              isAnimationActive={false}
              dot={false}
            >
              <ErrorBar
                dataKey="errorLowDown"
                width={lineWidth}
                strokeWidth={lineWidth - 1}
                stroke={colorDown}
              />
            </Line>
            <Line
              dataKey="errorLineHigh"
              stroke="none"
              isAnimationActive={false}
              dot={false}
            >
              <ErrorBar
                dataKey="errorHighUp"
                width={lineWidth}
                strokeWidth={lineWidth - 1}
                stroke={colorUp}
              />
            </Line>
            <Line
              dataKey="errorLineLow"
              stroke="none"
              isAnimationActive={false}
              dot={false}
            >
              <ErrorBar
                dataKey="errorLowUp"
                width={lineWidth}
                strokeWidth={lineWidth - 1}
                stroke={colorUp}
              />
            </Line>
            {refAreaLeft && refAreaRight && (
              <ReferenceArea
                x1={refAreaLeft}
                x2={refAreaRight}
                strokeOpacity={0.3}
                fill="hsl(var(--foreground))"
                fillOpacity={0.05}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
};
