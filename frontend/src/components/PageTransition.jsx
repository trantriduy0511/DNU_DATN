import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const PageTransition = ({ children }) => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [displayChildren, setDisplayChildren] = useState(children);
  const prevLocationRef = useRef(location.pathname + location.search);
  const isTransitioningRef = useRef(false);

  // Check if both locations are user pages (should skip transition)
  const isUserPage = (path) => {
    return path === '/home' || path === '/' || path.startsWith('/profile') || 
           path.startsWith('/groups') || path.startsWith('/events');
  };

  useEffect(() => {
    const currentLocation = location.pathname + location.search;
    const prevPath = prevLocationRef.current.split('?')[0];
    const currentPath = location.pathname;
    
    // Only trigger transition if location actually changed
    if (prevLocationRef.current !== currentLocation) {
      const prevWasUserPage = isUserPage(prevPath);
      const currentIsUserPage = isUserPage(currentPath);
      
      // Skip transition if both are user pages (smooth navigation between user pages)
      // This includes: /events <-> /home, /home <-> /groups/:id, etc.
      const shouldSkipTransition = prevWasUserPage && currentIsUserPage;
      
      prevLocationRef.current = currentLocation;
      
      if (shouldSkipTransition) {
        // Instant update for navigation between user pages (no fade)
        setDisplayChildren(children);
        setIsVisible(true);
        isTransitioningRef.current = false;
      } else {
        // Full transition only for non-user pages (like login, register, admin)
        isTransitioningRef.current = true;
      setIsVisible(false);
      
        // Very short delay for faster transitions
      const timer = setTimeout(() => {
        setDisplayChildren(children);
        // Use requestAnimationFrame for smoother transition
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsVisible(true);
              isTransitioningRef.current = false;
            });
          });
        }, 50); // Reduced to 50ms for faster transitions

      return () => clearTimeout(timer);
      }
    } else {
      // If location didn't change but children did (e.g., tab change within same page)
      setDisplayChildren(children);
    }
  }, [location.pathname, location.search, children]);

  return (
    <div
      className="page-container"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        transition: isTransitioningRef.current 
          ? 'opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
          : 'none',
        willChange: isTransitioningRef.current ? 'opacity, transform' : 'auto',
        minHeight: '100vh',
        // Prevent flash of unstyled content
        visibility: isVisible ? 'visible' : 'hidden'
      }}
    >
      {displayChildren}
    </div>
  );
};

export default PageTransition;

