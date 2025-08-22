// tailwind.config.js
export default {
  theme: {
    extend: {
      fontFamily: {
        newsreader: ["Newsreader", "serif"],
      },
    },
  },
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // include your React files
  ],
};
