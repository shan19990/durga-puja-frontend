"use client"

import {useState} from "react"
import {Award, Clock, Users} from "lucide-react"

export default function HistorySection() {
    const [isExpanded, setIsExpanded] = useState(false)

    const stats = [
        {icon: Clock, label: "Years of Tradition", value: "400+"},
        {icon: Award, label: "UNESCO Recognition", value: "2021"},
        {icon: Users, label: "Annual Visitors", value: "10M+"},
    ]

    return (
        <section id="history" className="py-20 px-10">
            <div className="max-w-6xl mx-auto">
                {/* Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 animate-fadeInUp">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon
                        return (
                            <div
                                key={index}
                                className="text-center p-8 gradient-border hover:scale-105 transition-transform duration-300"
                                style={{animationDelay: `${index * 0.2}s`}}
                            >
                                <div
                                    className="bg-gradient-to-r from-orange-500 to-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Icon className="text-white" size={32}/>
                                </div>
                                <h3 className="text-[1.8rem] md:text-3xl font-bold text-gray-800 mb-2">{stat.value}</h3>
                                <p className="text-gray-600">{stat.label}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
