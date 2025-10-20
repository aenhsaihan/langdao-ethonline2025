
import type { NextPage } from "next";

const Home: NextPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Hero Section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl border-2 border-blue-200 dark:border-blue-400 p-8 lg:p-12 relative overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              {/* Instant Matching Badge */}
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-pink-50 text-pink-600 border border-pink-200">
                <span className="mr-2">⚡</span>
                Instant Matching
              </div>

              {/* Main Heading */}
              <div className="space-y-2">
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                  Find Your Perfect
                </h1>
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent leading-tight">
                  Language Tutor
                </h1>
              </div>

              {/* Description */}
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-md">
                Connect with native speakers instantly through our roulette matching system. 
                Pay per second with streaming payments—no subscriptions, just pure learning.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-6 py-3 rounded-full font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center">
                  <span className="mr-2">⚡</span>
                  Find Tutor Now
                </button>
                <button className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-full font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center">
                  <span className="mr-2">📹</span>
                  How It Works
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-6">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">2,847</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Active Tutors</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">98%</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Success Rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">45+</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Languages</div>
                </div>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8 relative">
                {/* Video Call Interface Mockup */}
                <div className="bg-gray-900 rounded-lg p-4 shadow-2xl">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-blue-400 rounded aspect-video flex items-center justify-center">
                      <div className="w-8 h-8 bg-white rounded-full"></div>
                    </div>
                    <div className="bg-pink-400 rounded aspect-video flex items-center justify-center">
                      <div className="w-8 h-8 bg-white rounded-full"></div>
                    </div>
                    <div className="bg-orange-400 rounded aspect-video flex items-center justify-center">
                      <div className="w-8 h-8 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-green-400 rounded aspect-video flex items-center justify-center">
                      <div className="w-8 h-8 bg-white rounded-full"></div>
                    </div>
                    <div className="bg-purple-400 rounded aspect-video flex items-center justify-center">
                      <div className="w-8 h-8 bg-white rounded-full"></div>
                    </div>
                    <div className="bg-yellow-400 rounded aspect-video flex items-center justify-center">
                      <div className="w-8 h-8 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500 rounded-full opacity-20"></div>
                <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-purple-500 rounded-full opacity-20"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
