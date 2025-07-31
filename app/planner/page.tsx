'use client';

import dynamic from "next/dynamic";

const PlannerPage = dynamic(() => import("@/components/PlannerPage"), {
  ssr: false
});

export default PlannerPage;
