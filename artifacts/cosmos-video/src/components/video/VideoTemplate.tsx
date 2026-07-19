import { useVideoPlayer } from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';

import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = {
  scene1: 10000,
  scene2: 12000,
  scene3: 14000,
  scene4: 12000,
  scene5: 12000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
  });

  return (
    <div
      className="w-full h-screen overflow-hidden relative"
      style={{ backgroundColor: 'var(--color-primary)' }}
    >
      {/* Persistent Background Layer for Continuity */}
      <motion.div
        className="absolute inset-0 z-0 pointer-events-none"
        animate={{
          background: currentScene === 0 || currentScene === 4 
            ? 'radial-gradient(circle at 50% 50%, rgba(13, 27, 62, 0.4) 0%, rgba(8, 12, 24, 1) 100%)' 
            : currentScene === 1 
            ? 'radial-gradient(circle at 20% 80%, rgba(26, 47, 90, 0.5) 0%, rgba(8, 12, 24, 1) 100%)'
            : currentScene === 2
            ? 'radial-gradient(circle at 80% 20%, rgba(201, 168, 76, 0.1) 0%, rgba(8, 12, 24, 1) 100%)'
            : 'radial-gradient(circle at 50% 100%, rgba(79, 195, 247, 0.15) 0%, rgba(8, 12, 24, 1) 100%)'
        }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      
      {/* Gold accent line that travels across scenes */}
      <motion.div 
        className="absolute bottom-[10vh] left-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent z-10"
        animate={{
          width: currentScene === 4 ? '100vw' : '50vw',
          x: currentScene === 0 ? '-10vw' : currentScene === 1 ? '50vw' : currentScene === 2 ? '10vw' : currentScene === 3 ? '40vw' : '0vw',
          opacity: currentScene === 0 ? 0.3 : 0.8
        }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />

      <AnimatePresence mode="sync">
        {currentScene === 0 && <Scene1 key="scene1" />}
        {currentScene === 1 && <Scene2 key="scene2" />}
        {currentScene === 2 && <Scene3 key="scene3" />}
        {currentScene === 3 && <Scene4 key="scene4" />}
        {currentScene === 4 && <Scene5 key="scene5" />}
      </AnimatePresence>
    </div>
  );
}
