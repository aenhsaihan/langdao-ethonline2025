
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useActiveAccount } from "thirdweb/react";
import type { NextPage } from "next";
import { usePageView } from "~~/hooks/usePageView";
import { Globe } from "~~/components/Globe";
import { TestimonialsSection } from "~~/components/testimonials";
import { AuroraText } from "~~/components/ui/aurora-text";
import { WordRotate } from "~~/components/ui/word-rotate";
import { ShimmerButton } from "~~/components/ui/shimmer-button";
import { InteractiveGridPattern } from "~~/components/ui/interactive-grid-pattern";
import { TextAnimate } from "~~/components/ui/text-animate";
import { OnboardingFlow } from "~~/components/onboarding/OnboardingFlow";



const HomeView = ({ onHowItWorksClick }: { onHowItWorksClick: () => void }) => {
  return (
    <>
      <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
        <InteractiveGridPattern
          width={60}
          height={60}
          squares={[32, 20]}
          className="opacity-20 dark:opacity-30"
          squaresClassName="stroke-gray-400/20 dark:stroke-gray-400/40"
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              {/* Main Heading */}
              <div className="space-y-6 lg:space-y-8">
                <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-tight">
                  Talk. Learn.
                </h1>
                <div className="min-w-[180px] lg:min-w-[280px]">
                  <WordRotate 
                    words={["Earn.", "Teach.", "Practice.", "Connect."]}
                    className="text-5xl lg:text-7xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent"
                  />
                </div>
                <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-tight">
                  No <AuroraText>Bullshit.</AuroraText>
                </h1>
                <TextAnimate
                  className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-lg"
                  animation="blurInUp"
                  by="word"
                  delay={0.2}
                  duration={0.8}
                  startOnView={false}
                  once={false}
                >
                  Skip the apps, skip the subscriptions. Jump on a call with a native speaker right now. Pay by the second. Learn by doing.
                </TextAnimate>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-6">
                <ShimmerButton
                  background="rgba(0, 0, 0, 0.9)"
                  shimmerColor="#ffffff"
                  shimmerDuration="2s"
                  className="px-8 py-4 text-lg font-medium text-white"
                >
                  <span className="mr-2">🚀</span>
                  Start Talking
                </ShimmerButton>
                <ShimmerButton
                  onClick={onHowItWorksClick}
                  background="rgba(75, 85, 99, 0.8)"
                  shimmerColor="#e5e7eb"
                  shimmerDuration="3s"
                  className="px-8 py-4 text-lg font-medium text-white"
                >
                  <span className="mr-2">📹</span>
                  How It Works
                </ShimmerButton>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 pt-8">
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">2,847</div>
                  <TextAnimate
                    className="text-base text-gray-500 dark:text-gray-400"
                    animation="slideUp"
                    by="word"
                    delay={0.4}
                    duration={0.5}
                    startOnView={false}
                    once={false}
                  >
                    Active Tutors
                  </TextAnimate>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">98%</div>
                  <TextAnimate
                    className="text-base text-gray-500 dark:text-gray-400"
                    animation="slideUp"
                    by="word"
                    delay={0.5}
                    duration={0.5}
                    startOnView={false}
                    once={false}
                  >
                    Success Rate
                  </TextAnimate>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">45+</div>
                  <TextAnimate
                    className="text-base text-gray-500 dark:text-gray-400"
                    animation="slideUp"
                    by="word"
                    delay={0.6}
                    duration={0.5}
                    startOnView={false}
                    once={false}
                  >
                    Languages
                  </TextAnimate>
                </div>
              </div>
            </div>

            {/* Right Illustration - Interactive Globe */}
            <div className="relative flex items-center justify-center">
              <div className="relative w-[500px] h-[500px]">
                {/* Interactive COBE Globe */}
                <Globe className="w-full h-full" />

                {/* LangDAO Text Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <h3 className="text-4xl font-bold text-gray-900 dark:text-gray-900 mb-2">LangDAO</h3>
                    <p className="text-lg text-gray-700 dark:text-gray-700">Global Language Learning</p>
                  </div>
                </div>

                {/* Draggable Language Icons */}
                <motion.div 
                  drag 
                  whileDrag={{ scale: 1.2, rotate: 5 }}
                  whileHover={{ scale: 1.1 }}
                  dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                  className="absolute -top-4 -right-4 w-12 h-12 bg-blue-500 rounded-full opacity-90 flex items-center justify-center text-white font-bold text-sm shadow-lg cursor-grab active:cursor-grabbing"
                >
                  EN
                </motion.div>
                <motion.div 
                  drag 
                  whileDrag={{ scale: 1.2, rotate: -5 }}
                  whileHover={{ scale: 1.1 }}
                  dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                  className="absolute -bottom-4 -left-4 w-12 h-12 bg-green-500 rounded-full opacity-90 flex items-center justify-center text-white font-bold text-sm shadow-lg cursor-grab active:cursor-grabbing"
                >
                  ES
                </motion.div>
                <motion.div 
                  drag 
                  whileDrag={{ scale: 1.3, rotate: 10 }}
                  whileHover={{ scale: 1.1 }}
                  dragConstraints={{ left: -80, right: 80, top: -80, bottom: 80 }}
                  className="absolute top-1/4 -left-6 w-10 h-10 bg-purple-500 rounded-full opacity-90 flex items-center justify-center text-white font-bold text-xs shadow-lg cursor-grab active:cursor-grabbing"
                >
                  FR
                </motion.div>
                <motion.div 
                  drag 
                  whileDrag={{ scale: 1.3, rotate: -10 }}
                  whileHover={{ scale: 1.1 }}
                  dragConstraints={{ left: -80, right: 80, top: -80, bottom: 80 }}
                  className="absolute top-3/4 -right-6 w-10 h-10 bg-orange-500 rounded-full opacity-90 flex items-center justify-center text-white font-bold text-xs shadow-lg cursor-grab active:cursor-grabbing"
                >
                  中
                </motion.div>
                <motion.div 
                  drag 
                  whileDrag={{ scale: 1.4, rotate: 15 }}
                  whileHover={{ scale: 1.1 }}
                  dragConstraints={{ left: -60, right: 60, top: -60, bottom: 60 }}
                  className="absolute top-1/2 -left-2 w-8 h-8 bg-pink-500 rounded-full opacity-90 flex items-center justify-center text-white font-bold text-xs shadow-lg cursor-grab active:cursor-grabbing"
                >
                  日
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <TestimonialsSection />
    </>
  );
};

const HowItWorksView = ({ onBackToHome }: { onBackToHome: () => void }) => {
  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <InteractiveGridPattern
        width={60}
        height={60}
        squares={[32, 20]}
        className="opacity-20 dark:opacity-30"
        squaresClassName="stroke-gray-400/20 dark:stroke-gray-400/40"
      />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6">
            How It Works
          </h1>
          <TextAnimate
            className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
            animation="blurInUp"
            by="word"
            delay={0.1}
            duration={0.8}
            startOnView={false}
            once={false}
          >
            Learn languages through instant video calls with native speakers. Pay only for the time you use.
          </TextAnimate>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white font-bold text-2xl">1</span>
            </div>
            <TextAnimate
              className="text-2xl font-semibold text-gray-900 dark:text-white mb-4"
              animation="slideUp"
              by="word"
              delay={0.3}
              duration={0.6}
              startOnView={false}
              once={false}
            >
              Connect Wallet
            </TextAnimate>
            <TextAnimate
              className="text-lg text-gray-600 dark:text-gray-300"
              animation="fadeIn"
              by="word"
              delay={0.5}
              duration={0.8}
              startOnView={false}
              once={false}
            >
              Connect your Web3 wallet to get started with secure, decentralized payments.
            </TextAnimate>
          </div>

          <div className="text-center">
            <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white font-bold text-2xl">2</span>
            </div>
            <TextAnimate
              className="text-2xl font-semibold text-gray-900 dark:text-white mb-4"
              animation="slideUp"
              by="word"
              delay={0.4}
              duration={0.6}
              startOnView={false}
              once={false}
            >
              Find a Tutor
            </TextAnimate>
            <TextAnimate
              className="text-lg text-gray-600 dark:text-gray-300"
              animation="fadeIn"
              by="word"
              delay={0.6}
              duration={0.8}
              startOnView={false}
              once={false}
            >
              Use our roulette matching system to instantly connect with native speakers of your target language.
            </TextAnimate>
          </div>

          <div className="text-center">
            <div className="w-20 h-20 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white font-bold text-2xl">3</span>
            </div>
            <TextAnimate
              className="text-2xl font-semibold text-gray-900 dark:text-white mb-4"
              animation="slideUp"
              by="word"
              delay={0.5}
              duration={0.6}
              startOnView={false}
              once={false}
            >
              Start Learning
            </TextAnimate>
            <TextAnimate
              className="text-lg text-gray-600 dark:text-gray-300"
              animation="fadeIn"
              by="word"
              delay={0.7}
              duration={0.8}
              startOnView={false}
              once={false}
            >
              Begin your video call and pay per second with streaming payments. No subscriptions needed.
            </TextAnimate>
          </div>

          <div className="text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white font-bold text-2xl">4</span>
            </div>
            <TextAnimate
              className="text-2xl font-semibold text-gray-900 dark:text-white mb-4"
              animation="slideUp"
              by="word"
              delay={0.6}
              duration={0.6}
              startOnView={false}
              once={false}
            >
              Start Earning
            </TextAnimate>
            <TextAnimate
              className="text-lg text-gray-600 dark:text-gray-300"
              animation="fadeIn"
              by="word"
              delay={0.8}
              duration={0.8}
              startOnView={false}
              once={false}
            >
              Become a tutor yourself! Share your native language and earn crypto while helping others learn.
            </TextAnimate>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 mb-16">
          <TextAnimate
            className="text-3xl font-bold text-gray-900 dark:text-white mb-10 text-center"
            animation="blurInUp"
            by="word"
            delay={0.2}
            duration={0.8}
            startOnView={false}
            once={false}
          >
            Why Choose LangDAO?
          </TextAnimate>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-base">✓</span>
              </div>
              <div>
                <TextAnimate
                  className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
                  animation="slideLeft"
                  by="word"
                  delay={0.4}
                  duration={0.6}
                  startOnView={false}
                  once={false}
                >
                  Instant Matching
                </TextAnimate>
                <p className="text-gray-600 dark:text-gray-300 text-base">Connect with tutors in seconds, not days</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-base">✓</span>
              </div>
              <div>
                <TextAnimate
                  className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
                  animation="slideLeft"
                  by="word"
                  delay={0.5}
                  duration={0.6}
                  startOnView={false}
                  once={false}
                >
                  Pay Per Second
                </TextAnimate>
                <p className="text-gray-600 dark:text-gray-300 text-base">Only pay for the time you actually use</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-base">✓</span>
              </div>
              <div>
                <TextAnimate
                  className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
                  animation="slideLeft"
                  by="word"
                  delay={0.6}
                  duration={0.6}
                  startOnView={false}
                  once={false}
                >
                  Native Speakers
                </TextAnimate>
                <p className="text-gray-600 dark:text-gray-300 text-base">Learn from authentic native speakers</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-base">✓</span>
              </div>
              <div>
                <TextAnimate
                  className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
                  animation="slideLeft"
                  by="word"
                  delay={0.7}
                  duration={0.6}
                  startOnView={false}
                  once={false}
                >
                  Web3 Powered
                </TextAnimate>
                <p className="text-gray-600 dark:text-gray-300 text-base">Secure, decentralized, and transparent</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <ShimmerButton
            background="rgba(236, 72, 153, 0.9)"
            shimmerColor="#ffffff"
            shimmerDuration="2s"
            className="px-10 py-4 text-lg font-medium text-white"
          >
            <span className="mr-2">⚡</span>
            Get Started Now
          </ShimmerButton>
        </div>
      </div>
    </div>
  );
};

const ConnectedDashboard = () => {
  const handleOnboardingComplete = () => {
    // After onboarding is complete, show the main dashboard
    // For now, we'll just show a success message
    console.log("Onboarding completed!");
  };

  return (
    <OnboardingFlow onComplete={handleOnboardingComplete} />
  );
};

const HomeContent = () => {
  const { currentView, showHowItWorks, showHome } = usePageView();
  const account = useActiveAccount();

  // If wallet is connected, show dashboard
  if (account) {
    return <ConnectedDashboard />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {currentView === 'home' ? (
          <HomeView onHowItWorksClick={showHowItWorks} />
        ) : (
          <HowItWorksView onBackToHome={showHome} />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

const Home: NextPage = () => {
  return <HomeContent />;
};

export default Home;
