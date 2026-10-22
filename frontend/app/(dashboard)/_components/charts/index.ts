"use client";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "./chart-skeleton";

export const VolumeChart = dynamic(() => import("./volume-chart").then((m) => ({ default: m.VolumeChart })), { ssr: false, loading: ChartSkeleton });
export const PipelineChart = dynamic(() => import("./pipeline-chart").then((m) => ({ default: m.PipelineChart })), { ssr: false, loading: ChartSkeleton });
