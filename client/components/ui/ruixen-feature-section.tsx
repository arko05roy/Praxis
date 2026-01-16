"use client"

import { cn } from "@/lib/utils"
import { CardContent } from "@/components/ui/card";
import { TbHeartPlus } from "react-icons/tb";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Figma, Rocket, Star, Users, Zap } from "lucide-react";

export const Highlight = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <span
            className={cn(
                "font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-700/[0.2] dark:text-emerald-500 px-1 py-0.5",
                className
            )}
        >
            {children}
        </span>
    );
};


const CARDS = [
    {
        id: 0,
        name: "Sarah Chen",
        designation: "Frontend Developer",
        content: (
            <p>
                <Highlight>Ruixen UI</Highlight> has completely transformed our development workflow. The components are beautifully crafted and{" "}
                <Highlight>incredibly easy to integrate</Highlight> into any modern React application.
            </p>
        ),
    },
    {
        id: 1,
        name: "Alex Rodriguez",
        designation: "UI/UX Designer",
        content: (
            <p>
                The <Highlight>design system</Highlight> behind Ruixen UI is both elegant and consistent. From layout to interactivity, every detail is thoughtfully built with{" "}
                <Highlight>accessibility and usability</Highlight> in mind.
            </p>
        ),
    },
    {
        id: 2,
        name: "David Kim",
        designation: "Product Manager",
        content: (
            <p>
                After adopting <Highlight>Ruixen UI</Highlight>, our team shipped features 40% faster. The rich component library and{" "}
                <Highlight>clear documentation</Highlight> have made it an essential tool in our product development.
            </p>
        ),
    },
];


const integrations = [
    {
        name: "Figma",
        desc: "Design collaboratively in real-time with intuitive UI tools",
        icon: <Figma className="w-5 h-5 text-purple-500" />,
    },
    {
        name: "Vercel",
        desc: "Deploy your projects seamlessly with global scale",
        icon: <Rocket className="w-5 h-5 text-black dark:text-white" />,
    }
];


export default function RuixenSection() {
    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 relative gap-8">
                {/* Left Block */}
                <div className="flex flex-col items-start justify-center border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                    {/* Card */}
                    <div className="relative w-full mb-4 sm:mb-6 min-h-[250px]">
                        <div className="absolute inset-x-0 -bottom-2 h-16 sm:h-20 lg:h-24 bg-gradient-to-t from-white dark:from-zinc-900 via-white/80 dark:via-zinc-900/80 to-transparent z-10 pointer-events-none"></div>
                        <CardStack items={CARDS} />
                    </div>

                    {/* Content */}
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-normal text-gray-900 dark:text-white leading-relaxed mt-auto">
                        Intuitive Dashboard Experience <span className="text-emerald-500 font-medium">Ruixen UI</span>{" "}
                        <span className="text-gray-500 dark:text-gray-400 text-sm sm:text-base lg:text-lg"> Simplify your development workflow with our beautifully designed components that provide actionable insights out of the box.</span>
                    </h3>
                </div>

                {/* Right Block */}
                <div className="flex flex-col items-center justify-start border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                    {/* Content */}
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-normal text-gray-900 dark:text-white mb-4 sm:mb-6 leading-relaxed">
                        Seamless Integration Ecosystem <span className="text-emerald-500 font-medium">Ruixen UI</span>{" "}
                        <span className="text-gray-500 dark:text-gray-400 text-sm sm:text-base lg:text-lg"> Integrate effortlessly with your favorite tools using Ruixen's smart API-ready architecture and eliminate silos in seconds.</span>
                    </h3>
                    <div
                        className={cn(
                            "group relative mt-auto w-full inline-flex animate-rainbow cursor-pointer items-center justify-center rounded-xl border-0 bg-white dark:bg-black px-4 sm:px-6 lg:px-8 py-2 font-medium text-primary-foreground transition-colors [background-clip:padding-box,border-box,border-box] [background-origin:border-box] [border:calc(0.08*1rem)_solid_transparent] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",

                            // before styles
                            "before:absolute before:bottom-[8%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))] before:bg-[length:200%] before:[filter:blur(calc(0.8*1rem))]",
                        )}
                    >
                        {/* Integration List */}
                        <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-2xl sm:rounded-3xl z-10 w-full">
                            {integrations.map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-2 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-xl sm:rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
                                >
                                    <div className="flex items-center gap-2 sm:gap-3 flex-1">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                            {item.icon}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm sm:text-base font-medium text-foreground truncate">{item.name}</p>
                                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 sm:line-clamp-2">{item.desc}</p>
                                        </div>
                                    </div>
                                    <button className="rounded-full border border-gray-200 dark:border-gray-700 p-2 text-xs font-semibold flex-shrink-0 ml-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"><TbHeartPlus className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" /></button>
                                </div>
                            ))}
                        </CardContent>
                    </div>
                </div>
            </div>

            {/* Stats and Testimonial Section */}
            <div className="mt-12 sm:mt-16 lg:mt-20 grid gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
                <div className="flex justify-center items-center p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl">
                    <div className="grid grid-cols-3 gap-6 sm:gap-8 lg:gap-6 xl:gap-8 w-full text-center sm:text-left">
                        <div className="space-y-2 sm:space-y-3">
                            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                1200+
                            </div>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">GitHub Stars</p>
                        </div>
                        <div className="space-y-2 sm:space-y-3">
                            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                                <Users className="w-5 h-5 text-blue-500" />
                                22M
                            </div>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">Active Users</p>
                        </div>
                        <div className="space-y-2 sm:space-y-3">
                            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                                <Zap className="w-5 h-5 text-orange-500" />
                                500+
                            </div>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">Powered Apps</p>
                        </div>
                    </div>
                </div>
                <div className="relative flex items-center">
                    <blockquote className="border-l-4 border-emerald-500 pl-4 sm:pl-6 lg:pl-8 text-gray-700 dark:text-gray-300">
                        <p className="text-base sm:text-lg lg:text-xl leading-relaxed italic">"Using Ruixen UI has been like unlocking a new level of productivity. It's the perfect fusion of simplicity and versatility, enabling us to create stunning UIs."</p>
                        <div className="mt-4 sm:mt-6 flex items-center gap-4">
                            <Image
                                className="h-10 sm:h-12 w-10 sm:w-12 rounded-full object-cover"
                                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=100&h=100"
                                alt="Saurabh"
                                height={48}
                                width={48}
                            />
                            <div>
                                <cite className="block font-bold text-sm sm:text-base text-gray-900 dark:text-white not-italic">Saurabh Sharma</cite>
                                <span className="text-sm text-gray-500 dark:text-gray-500">CEO, TechFlow</span>
                            </div>
                        </div>
                    </blockquote>
                </div>
            </div>
        </section>
    )
}

let interval: any;

type Card = {
    id: number;
    name: string;
    designation: string;
    content: React.ReactNode;
};

export const CardStack = ({
    items,
    offset,
    scaleFactor,
}: {
    items: Card[];
    offset?: number;
    scaleFactor?: number;
}) => {
    const CARD_OFFSET = offset || 10;
    const SCALE_FACTOR = scaleFactor || 0.06;
    const [cards, setCards] = useState<Card[]>(items);

    useEffect(() => {
        startFlipping();

        return () => clearInterval(interval);
    }, []);
    const startFlipping = () => {
        interval = setInterval(() => {
            setCards((prevCards: Card[]) => {
                const newArray = [...prevCards]; // create a copy of the array
                newArray.unshift(newArray.pop()!); // move the last element to the front
                return newArray;
            });
        }, 5000);
    };

    return (
        <div className="relative mx-auto h-48 w-full md:h-48 md:w-96 my-4">

            {cards.map((card, index) => {
                return (
                    <motion.div
                        key={card.id}
                        className="absolute dark:bg-black bg-white h-48 w-full md:h-48 md:w-96 rounded-3xl p-6 shadow-xl border border-neutral-200 dark:border-white/[0.1] flex flex-col justify-between"
                        style={{
                            transformOrigin: "top center",
                        }}
                        animate={{
                            top: index * -CARD_OFFSET,
                            scale: 1 - index * SCALE_FACTOR, // decrease scale for cards that are behind
                            zIndex: cards.length - index, //  decrease z-index for the cards that are behind
                        }}
                    >
                        <div className="font-normal text-neutral-700 dark:text-neutral-200 leading-relaxed text-sm sm:text-base">
                            {card.content}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                                {card.name.charAt(0)}
                            </div>
                            <div>
                                <p className="text-neutral-900 font-semibold text-sm dark:text-white">
                                    {card.name}
                                </p>
                                <p className="text-neutral-400 font-normal text-xs dark:text-neutral-400">
                                    {card.designation}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};
