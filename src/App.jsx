import React, { useState, useEffect, useRef } from 'react';

const HeptagramWithMovingDots = () => {
  // Control state
  const [numDots, setNumDots] = useState(12);
  const [speed, setSpeed] = useState(0.2);
  const [deceleration, setDeceleration] = useState(1);
  const [rotationRate, setRotationRate] = useState(10);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [showPath, setShowPath] = useState(false);
  const [shapes, setShapes] = useState([]);
  const [currentShape, setCurrentShape] = useState([]);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);

  // Predefined shape patterns
  const [triangles] = useState([
    [0, 4, 8],
    [1, 5, 9],
    [2, 6, 10],
    [3, 7, 11],
  ]);
  const [rectangles] = useState([
    [0, 3, 6, 9],
    [1, 4, 7, 10],
    [2, 5, 8, 11],
  ]);

  // Visibility toggles
  const [showTriangles, setShowTriangles] = useState(false);
  const [showRectangles, setShowRectangles] = useState(false);

  // Animation ref
  const animationRef = useRef(null);

  // Calculate the points for a regular heptagon
  const calculateHeptagonPoints = () => {
    const points = [];
    const cx = 200;
    const cy = 200;
    const r = 180;
    const numPoints = 7;

    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points.push([x, y]);
    }

    return points;
  };

  const heptagonPoints = calculateHeptagonPoints();

  // Create the order of points to form a 7/3 heptagram
  const getHeptagramOrder = () => {
    const order = [];
    let current = 0;
    for (let i = 0; i < 7; i++) {
      order.push(current);
      current = (current + 3) % 7;
    }
    return order;
  };

  const heptagramOrder = getHeptagramOrder();
  const heptagramPath = heptagramOrder.map((idx) => heptagonPoints[idx]);

  // Calculate distance between two points
  const distance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
  };

  // Calculate all segment lengths and total path length
  const calculatePathMetrics = () => {
    const segmentLengths = [];
    let totalLength = 0;

    for (let i = 0; i < heptagramPath.length; i++) {
      const nextIdx = (i + 1) % heptagramPath.length;
      const segmentLength = distance(heptagramPath[i], heptagramPath[nextIdx]);
      segmentLengths.push(segmentLength);
      totalLength += segmentLength;
    }

    return { segmentLengths, totalLength };
  };

  const { segmentLengths, totalLength } = calculatePathMetrics();

  // Generate the SVG path data for the heptagram
  const generateHeptagramPath = () => {
    if (heptagramPath.length < 7) return '';

    let path = `M${heptagramPath[0][0]},${heptagramPath[0][1]}`;

    for (let i = 1; i < heptagramPath.length; i++) {
      path += ` L${heptagramPath[i][0]},${heptagramPath[i][1]}`;
    }

    // Close the path
    path += ' Z';
    return path;
  };

  // Create or update dots state
  const [dots, setDots] = useState([]);

  // Initialize dots based on numDots
  useEffect(() => {
    const newDots = [];
    for (let i = 0; i < numDots; i++) {
      const pathTime = i / numDots; // Evenly distribute dots by time
      const point = getPointAtTime(pathTime);

      newDots.push({
        id: i,
        x: point.x,
        y: point.y,
        pathTime,
        pathDistance: point.pathDistance,
        color: '#444444',
      });
    }

    setDots(newDots);
    // Reset shapes when changing dot count
    setShapes([]);
    setCurrentShape([]);
  }, [numDots]);

  // Handle dot selection/connection
  const handleDotClick = (dotId) => {
    // If this dot is already in the current shape and it's the last one, remove it
    if (
      currentShape.length > 0 &&
      currentShape[currentShape.length - 1] === dotId
    ) {
      setCurrentShape((prev) => prev.slice(0, -1));
      return;
    }

    // If this dot is already in the current shape (but not the last one), complete the shape
    if (currentShape.includes(dotId) && currentShape.length >= 3) {
      // Only add the shape if it has at least 3 points
      if (currentShape.length >= 3) {
        setShapes((prev) => [...prev, [...currentShape]]);
      }
      setCurrentShape([]); // Start a new shape
      return;
    }

    // Add this dot to the current shape
    setCurrentShape((prev) => [...prev, dotId]);
  };

  // Handle mouse down event on SVG for shape creation
  const handleMouseDown = (e) => {
    if (
      e.target.tagName === 'circle' &&
      e.target.getAttribute('data-dot-id') !== null
    ) {
      // Already handled by dot click
      return;
    }

    // Start a new shape when clicking on empty space
    if (currentShape.length >= 3) {
      // If we have a shape in progress with at least 3 points, complete it
      setShapes((prev) => [...prev, [...currentShape]]);
    }
    setCurrentShape([]);
  };

  // Check if a dot is in any shape (for coloring)
  const isDotInAnyShape = (dotId) => {
    return (
      currentShape.includes(dotId) ||
      shapes.some((shape) => shape.includes(dotId)) ||
      (showTriangles &&
        triangles.some((triangle) => triangle.includes(dotId))) ||
      (showRectangles &&
        rectangles.some((rectangle) => rectangle.includes(dotId)))
    );
  };

  // Generate polygon points from a shape array
  const getPolygonPoints = (shape) => {
    if (shape.length < 2) return '';

    return shape
      .map((id) => {
        const dot = dots.find((d) => d.id === id);
        return dot ? `${dot.x},${dot.y}` : '';
      })
      .join(' ');
  };

  // Animation effect
  useEffect(() => {
    if (speed <= 0 && rotationRate === 0) return; // Don't animate if everything is stopped

    let lastTimestamp = 0;

    const animate = (timestamp) => {
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }

      const elapsed = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      // Handle dot movement along the path
      if (speed > 0) {
        // Scale down the speed by factor of 0.1 to make it more reasonable
        const effectiveSpeed = speed * 0.1;

        setDots((currentDots) =>
          currentDots.map((dot) => {
            // Increment the time parameter uniformly for all dots
            const timeIncrement = (elapsed * effectiveSpeed) / 1000;
            const newTime = (dot.pathTime + timeIncrement) % 1;

            // Get the new position based on the updated time
            const point = getPointAtTime(newTime);

            return {
              ...dot,
              x: point.x,
              y: point.y,
              pathTime: newTime,
              pathDistance: point.pathDistance,
            };
          })
        );
      }

      // Handle rotation of the entire heptagram
      if (rotationRate !== 0) {
        const rotationAmount = (elapsed * rotationRate) / 1000;
        setRotationAngle((angle) => (angle + rotationAmount) % 360);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [speed, deceleration, rotationRate]);

  // Add this new function to replace getPointAtDistance
  const getPointAtTime = (time) => {
    // Ensure time wraps around (0-1)
    let normalizedTime = time % 1;
    if (normalizedTime < 0) normalizedTime += 1;

    const numSegments = heptagramPath.length;
    const segmentTime = 1 / numSegments; // Each segment gets an equal portion of time

    // Determine which segment we're in
    const segmentIdx = Math.floor(normalizedTime / segmentTime);

    // Calculate time position within the segment (0-1)
    const timeInSegment =
      (normalizedTime - segmentIdx * segmentTime) / segmentTime;

    // Apply acceleration/deceleration effect
    let adjustedTimeInSegment;

    if (deceleration === 0) {
      // Linear mapping (constant speed)
      adjustedTimeInSegment = timeInSegment;
    } else {
      // Use an easing function based on a sine wave for smooth acceleration/deceleration
      const eased = (Math.sin(Math.PI * (timeInSegment - 0.5)) + 1) / 2;

      // Blend between linear and eased based on deceleration value
      if (deceleration > 0) {
        // Slow at vertices: blend linear and eased
        adjustedTimeInSegment =
          timeInSegment * (1 - deceleration) + eased * deceleration;
      } else {
        // Fast at vertices: blend linear and inverted eased
        const invertedEased = 1 - eased;
        adjustedTimeInSegment =
          timeInSegment * (1 + deceleration) - invertedEased * deceleration;
      }
    }

    // Get the segment start and end points
    const startPoint = heptagramPath[segmentIdx];
    const endPoint = heptagramPath[(segmentIdx + 1) % heptagramPath.length];

    // Interpolate to get the actual point
    const x =
      startPoint[0] + adjustedTimeInSegment * (endPoint[0] - startPoint[0]);
    const y =
      startPoint[1] + adjustedTimeInSegment * (endPoint[1] - startPoint[1]);

    // Calculate pathDistance (for compatibility with other code)
    let pathDistance = 0;
    for (let i = 0; i < segmentIdx; i++) {
      pathDistance += segmentLengths[i];
    }
    pathDistance += adjustedTimeInSegment * segmentLengths[segmentIdx];

    return {
      x,
      y,
      segmentIdx,
      adjustedTimeInSegment,
      timeInSegment,
      pathTime: normalizedTime,
      pathDistance,
    };
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-white p-6">
<h2 className="text-3xl font-light mb-2 text-gray-800">
  What do you see here?
</h2>
<p className="text-xl font-light mb-6 text-gray-600">
  How people can disagree on the same data
</p>

      {/* Main visualization */}
      <div className="relative w-full max-w-xl mb-8">
        <svg
          viewBox="0 0 400 400"
          className="w-full"
          onMouseDown={handleMouseDown}
        >
          {/* Rotation container */}
          <g transform={`rotate(${rotationAngle} 200 200)`}>
            {/* Outer circle */}
            <circle
              cx="200"
              cy="200"
              r="180"
              fill="none"
              stroke="#eaeaea"
              strokeWidth="1"
            />

            {/* Heptagram */}
            {showPath && (
              <path
                d={generateHeptagramPath()}
                fill="none"
                stroke="#edc42f"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Center point */}
            <circle cx="200" cy="200" r="2" fill="#6b7280" />

            {/* Completed shapes */}
            {shapes.map((shape, shapeIndex) => (
              <polygon
                key={`shape-${shapeIndex}`}
                points={getPolygonPoints(shape)}
                fill={`rgba(${(shapeIndex * 40) % 255}, ${
                  (shapeIndex * 70) % 255
                }, ${(shapeIndex * 120) % 255}, 0.15)`}
                stroke={`rgba(${(shapeIndex * 40) % 255}, ${
                  (shapeIndex * 70) % 255
                }, ${(shapeIndex * 120) % 255}, 0.7)`}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            ))}

            {/* Current shape being created */}
            {currentShape.length >= 2 && (
              <polygon
                points={getPolygonPoints(currentShape)}
                fill="rgba(245, 158, 11, 0.15)"
                stroke="rgba(245, 158, 11, 0.7)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            )}

            {/* Triangles */}
            {showTriangles &&
              triangles.map((triangle, index) => (
                <polygon
                  key={`triangle-${index}`}
                  points={getPolygonPoints(triangle)}
                  fill="rgba(239, 68, 68, 0.15)"
                  stroke="rgba(239, 68, 68, 0.7)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              ))}

            {/* Rectangles */}
            {showRectangles &&
              rectangles.map((rectangle, index) => (
                <polygon
                  key={`rectangle-${index}`}
                  points={getPolygonPoints(rectangle)}
                  fill="rgba(59, 130, 246, 0.15)"
                  stroke="rgba(59, 130, 246, 0.7)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              ))}

            {/* Moving dots */}
            {dots.map((dot) => (
              <circle
                key={`dot-${dot.id}`}
                data-dot-id={dot.id}
                cx={dot.x}
                cy={dot.y}
                r="4"
                fill={isDotInAnyShape(dot.id) ? '#111827' : '#374151'}
                stroke={isDotInAnyShape(dot.id) ? '#111827' : '#9ca3af'}
                strokeWidth="1"
                style={{ cursor: 'pointer' }}
                onClick={() => handleDotClick(dot.id)}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Primary Controls */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        <button
          onClick={() => setShowTriangles(!showTriangles)}
          className={`py-2 px-4 rounded-md transition-colors duration-200 text-sm font-medium ${
            showTriangles
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {showTriangles ? 'Hide Triangles' : 'Perspective 1'}
        </button>

        <button
          onClick={() => setShowRectangles(!showRectangles)}
          className={`py-2 px-4 rounded-md transition-colors duration-200 text-sm font-medium ${
            showRectangles
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {showRectangles ? 'Hide Rectangles' : 'Perspective 2'}
        </button>

        <button
          onClick={() => setShowPath(!showPath)}
          className={`py-2 px-4 rounded-md transition-colors duration-200 text-sm font-medium ${
            showPath
              ? 'bg-gray-700 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {showPath ? 'Hide Path' : 'Perspective 3'}
        </button>
      </div>

      {/* Advanced Controls Toggle */}
      <div className="flex items-center justify-center mb-4">
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={showAdvancedControls}
              onChange={() => setShowAdvancedControls(!showAdvancedControls)}
            />
            <div className="block bg-gray-200 w-10 h-6 rounded-full"></div>
            <div
              className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${
                showAdvancedControls ? 'transform translate-x-4' : ''
              }`}
            ></div>
          </div>
          <div className="ml-3 text-sm font-medium text-gray-600">
            Advanced Controls
          </div>
        </label>
      </div>

      {/* Advanced Controls */}
      {showAdvancedControls && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-xl p-6 bg-gray-50 rounded-lg shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Dots: {numDots}
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={numDots}
              onChange={(e) => setNumDots(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Speed: {speed.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Acceleration: {deceleration.toFixed(2)}
            </label>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.05"
              value={deceleration}
              onChange={(e) => setDeceleration(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rotation: {rotationRate}°/s
            </label>
            <input
              type="range"
              min="-20"
              max="20"
              value={rotationRate}
              onChange={(e) => setRotationRate(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HeptagramWithMovingDots;
