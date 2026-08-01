import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type WithElementRef<T, E extends EventTarget = HTMLElement> = T & {
	ref?: E | null;
};

export type WithoutChildren<T> = T;

export type WithoutChildrenOrChild<T> = T;

export type WithoutChild<T> = T;
