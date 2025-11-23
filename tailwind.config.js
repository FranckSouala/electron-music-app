/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#ff4500', // Orange-red like Winamp
                dark: '#121212',
                darker: '#0a0a0a',
                surface: '#1e1e1e',
                'surface-hover': '#2a2a2a',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
