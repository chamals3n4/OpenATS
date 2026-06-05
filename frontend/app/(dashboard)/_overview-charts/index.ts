"use client";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "./chart-skeleton";

export const PipelineChart = dynamic(() => import("./pipeline-chart").then((m) => ({ default: m.PipelineChart })), { ssr: false, loading: ChartSkeleton });
export const VolumeChart = dynamic(() => import("./volume-chart").then((m) => ({ default: m.VolumeChart })), { ssr: false, loading: ChartSkeleton });
export const SourceChart = dynamic(() => import("./source-chart").then((m) => ({ default: m.SourceChart })), { ssr: false, loading: ChartSkeleton });
export const DeptChart = dynamic(() => import("./dept-chart").then((m) => ({ default: m.DeptChart })), { ssr: false, loading: ChartSkeleton });
export const OfferChart = dynamic(() => import("./offer-chart").then((m) => ({ default: m.OfferChart })), { ssr: false, loading: ChartSkeleton });
