import {
   useCallback,
   useEffect,
   useRef,
   type CSSProperties,
   type ReactNode,
   type PointerEvent as ReactPointerEvent,
} from 'react';
import './scrollbar.css';
export interface ScrollbarProps {
   autoHide?: boolean;
   children?: ReactNode;
   className?: string;
   height?: CSSProperties['height'];
   shadow?: boolean;
   width?: CSSProperties['width'];
}
type Axis = 'x' | 'y';
const SCROLL_IDLE_MS = 800;
const LINE_HEIGHT_PX = 16;
const cx = (...classes: Array<string | false | undefined>) =>
   classes.filter(Boolean).join(' ');
const Scrollbar = ({
   autoHide = true,
   children,
   className = '',
   height = '100%',
   shadow = false,
   width = '100%',
}: ScrollbarProps) => {
   const rootRef = useRef<HTMLDivElement>(null);
   const viewportRef = useRef<HTMLDivElement>(null);
   const startDrag = useCallback((axis: Axis) => {
      return (event: ReactPointerEvent<HTMLDivElement>) => {
         if (event.button !== 0) return;
         const root = rootRef.current;
         const viewport = viewportRef.current;
         const thumb = event.currentTarget;
         const track = thumb.parentElement;
         if (!root || !viewport || !track) return;
         event.preventDefault();
         thumb.setPointerCapture(event.pointerId);
         const vertical = axis === 'y';
         const startPointer = vertical ? event.clientY : event.clientX;
         const startScroll = vertical
            ? viewport.scrollTop
            : viewport.scrollLeft;
         const trackRect = track.getBoundingClientRect();
         const thumbRect = thumb.getBoundingClientRect();
         const trackLength = vertical ? trackRect.height : trackRect.width;
         const thumbLength = vertical ? thumbRect.height : thumbRect.width;
         const maxScroll = vertical
            ? viewport.scrollHeight - viewport.clientHeight
            : viewport.scrollWidth - viewport.clientWidth;
         const ratio = maxScroll / Math.max(1, trackLength - thumbLength);
         root.dataset.dragging = '';
         thumb.dataset.dragging = '';
         const move = (e: PointerEvent) => {
            const delta = (vertical ? e.clientY : e.clientX) - startPointer;
            viewport.scrollTo({
               [vertical ? 'top' : 'left']: startScroll + delta * ratio,
               behavior: 'instant',
            } as ScrollToOptions);
         };
         const end = () => {
            thumb.removeEventListener('pointermove', move);
            thumb.removeEventListener('pointerup', end);
            thumb.removeEventListener('pointercancel', end);
            thumb.removeEventListener('lostpointercapture', end);
            delete root.dataset.dragging;
            delete thumb.dataset.dragging;
         };
         thumb.addEventListener('pointermove', move);
         thumb.addEventListener('pointerup', end);
         thumb.addEventListener('pointercancel', end);
         thumb.addEventListener('lostpointercapture', end);
      };
   }, []);
   useEffect(() => {
      const root = rootRef.current;
      const viewport = viewportRef.current;
      if (!autoHide || !root || !viewport) return;
      let timer: number | undefined;
      const onScroll = () => {
         root.dataset.scrolling = '';
         window.clearTimeout(timer);
         timer = window.setTimeout(() => {
            delete root.dataset.scrolling;
         }, SCROLL_IDLE_MS);
      };
      viewport.addEventListener('scroll', onScroll, { passive: true });
      return () => {
         viewport.removeEventListener('scroll', onScroll);
         window.clearTimeout(timer);
         delete root.dataset.scrolling;
      };
   }, [autoHide]);
   useEffect(() => {
      const root = rootRef.current;
      const viewport = viewportRef.current;
      if (!root || !viewport) return;
      const onWheel = (event: WheelEvent) => {
         const target = event.target as Element | null;
         const track = target?.closest?.('.cs-track');
         if (!track || track.parentElement !== root) return;
         event.preventDefault();
         const unit =
            event.deltaMode === WheelEvent.DOM_DELTA_LINE
               ? LINE_HEIGHT_PX
               : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
                 ? viewport.clientHeight
                 : 1;
         viewport.scrollBy({
            top: event.deltaY * unit,
            left: event.deltaX * unit,
         });
      };
      root.addEventListener('wheel', onWheel, { passive: false });
      return () => root.removeEventListener('wheel', onWheel);
   }, []);
   return (
      <div
         className={cx('cs-root', autoHide && 'cs-root--auto_hide', className)}
         ref={rootRef}
         style={{ width, height }}
      >
         <div ref={viewportRef} className='cs-viewport'>
            {children}
         </div>
         {shadow && (
            <>
               <div aria-hidden='true' className='cs-shadow cs-shadow--top' />
               <div
                  aria-hidden='true'
                  className='cs-shadow cs-shadow--bottom'
               />
               <div aria-hidden='true' className='cs-shadow cs-shadow--start' />
               <div aria-hidden='true' className='cs-shadow cs-shadow--end' />
            </>
         )}
         <div className='cs-track cs-track--y' aria-hidden='true'>
            <div
               className='cs-thumb cs-thumb--y'
               onPointerDown={startDrag('y')}
            />
         </div>
         <div className='cs-track cs-track--x' aria-hidden='true'>
            <div
               className='cs-thumb cs-thumb--x'
               onPointerDown={startDrag('x')}
            />
         </div>
      </div>
   );
};
export default Scrollbar;

