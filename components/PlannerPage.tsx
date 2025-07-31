'use client';

import Navigation from "@/components/navigation";
import Planner from "@/components/planner";
import ContactUsModal from "@/components/ContactUsModal";
import { useState, useEffect } from "react";
import axios from "axios";

interface Pandal {
  id: number;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  is_big: boolean;
  main_pic?: string | null;
}

export default function PlannerPage() {
  const [pandals, setPandals] = useState<Pandal[]>([]);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    async function getPandals() {
      try {
        const res = await axios.get("https://durgapujo.in/api/pandals");
        setPandals(res.data);
      } catch (error) {
        console.error("Error fetching pandals:", error);
      }
    }
    getPandals();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Navigation />
      <Planner pandals={pandals} />
      <button
        onClick={() => setShowContact((prev) => !prev)}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition duration-300 flex items-center justify-center"
        title="Contact Us"
      >
        📞
      </button>
      <ContactUsModal isOpen={showContact} onClose={() => setShowContact(false)} />
    </main>
  );
}
