import Image from "next/image";

export default function Home() {
  return (
    <div className="font-sans  max-w-7xl mx-auto">
      <header className="flex items-center justify-between mt-6">
        <h2 className="text-2xl font-ligh">weppo</h2>
        <nav className="flex items-center justify-between">
          <ul className="flex items-center justify-between gap-4">
            <li><a href="#">Home</a></li>
            <li><a href="#">About</a></li>
            <li><a href="#">Contact</a></li>
          </ul>
        </nav>

        <button className="bg-white text-black px-4 py-2 rounded-full">Get Started</button>
      </header> 
      <div className="mt-20 flex flex-col items-center justify-center">
        <h1 className="text-7xl text-center">The Monetization Layer for AI Agents</h1>
        <p className="text-xl text-gray-500 mt-2 p-2 ">Weppo enables autonomous agents to pay for services and monetize their capabilities seamlessly in few lines of code</p>
      </div>
    </div>
  );
}
