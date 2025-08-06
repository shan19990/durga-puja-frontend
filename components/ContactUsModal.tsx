"use client"

import { useState } from "react"
import { showToast } from '@/lib/toast';

export default function ContactUsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    contact: "",
    message: "",
  })

  const submitContact = async () => {
    try {
        const res = await fetch("https://durgapujo.in/api/send_email/send-contact/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(contactForm),
        });

        const result = await res.json();

        if (res.ok) {
            showToast.success("Thank you for your message!");
            setContactForm({ name: "", email: "", contact: "", message: "" }); // ✅ reset fields
            onClose();
        } else {
            showToast.error(result.error || "Something went wrong.");
        }
    } catch (err) {
        console.error(err);
        showToast.error("Error sending message.");
    }
    };



  if (!isOpen) return null

  return (
    <div className="fixed bottom-24 right-6 z-[9999] bg-white p-4 rounded-lg shadow-lg w-80">
        <h2 className="text-xl mb-2 font-semibold text-center">Contact Us</h2>
        <input
            type="text"
            placeholder="Your Name"
            value={contactForm.name}
            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-gray-300 rounded text-sm"
        />
        <input
            type="email"
            placeholder="Your Email"
            value={contactForm.email}
            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-gray-300 rounded text-sm"
        />
        <input
            type="text"
            placeholder="Your Contact Number"
            value={contactForm.contact}
            onChange={(e) => setContactForm({ ...contactForm, contact: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-gray-300 rounded text-sm"
        />
        <textarea
            placeholder="Your Message"
            value={contactForm.message}
            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-gray-300 rounded text-sm"
            rows={3}
        />
        <button
            onClick={submitContact}
            className="w-full bg-green-600 text-white py-2 rounded text-sm hover:bg-green-700"
        >
            Send
        </button>
        </div>

  )
}
