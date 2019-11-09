export const createParticleSystem = (gl, { count = 1024, roomSize, maxDuration, speed }) => {
  const positionData = new Float32Array(count * 3).map(() => (Math.random() * 2 - 1) * roomSize);
  const velocityData = new Float32Array(count * 3).map(() => (Math.random() * 2 - 1) * speed);
  const durationData = new Float32Array(count).map(() => Math.random() * maxDuration);
  const lapsedData = new Float32Array(count).map(() => Math.random() * maxDuration);
  const positionBuffers = [gl.createBuffer(), gl.createBuffer()];
  const velocityBuffers = [gl.createBuffer(), gl.createBuffer()];
  const durationBuffers = [gl.createBuffer(), gl.createBuffer()];
  const lapsedBuffers = [gl.createBuffer(), gl.createBuffer()];
  const feedbackBuffers = [gl.createTransformFeedback(), gl.createTransformFeedback()];
  const updateArrays = [gl.createVertexArray(), gl.createVertexArray()];

  // Populate the 'update' buffers with data
  for (let i = 0; i < 2; i++) {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffers[i]);
    gl.bufferData(gl.ARRAY_BUFFER, positionData, gl.STREAM_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, velocityBuffers[i]);
    gl.bufferData(gl.ARRAY_BUFFER, velocityData, gl.STREAM_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, durationBuffers[i]);
    gl.bufferData(gl.ARRAY_BUFFER, durationData, gl.STREAM_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, lapsedBuffers[i]);
    gl.bufferData(gl.ARRAY_BUFFER, lapsedData, gl.STREAM_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
  for (let i = 0; i < 2; i++) {
    // Setup the transformFeedbacks
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedbackBuffers[i]);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, positionBuffers[(i + 1) % 2]);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, velocityBuffers[(i + 1) % 2]);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, durationBuffers[(i + 1) % 2]);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 3, lapsedBuffers[(i + 1) % 2]);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    // Setup the Vertex Array
    gl.bindVertexArray(updateArrays[i]);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffers[i]);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ARRAY_BUFFER, velocityBuffers[i]);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);
    gl.bindBuffer(gl.ARRAY_BUFFER, durationBuffers[i]);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(2);
    gl.bindBuffer(gl.ARRAY_BUFFER, lapsedBuffers[i]);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(3);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  let index = 1;
  return {
    array: updateArrays,
    feedback: feedbackBuffers,
    next: () => (index = (index + 1) % 2),
    dispose: () => {
      for (let i = 0; i < 2; i++) {
        gl.deleteBuffer(positionBuffers[i]);
        gl.deleteBuffer(velocityBuffers[i]);
        gl.deleteBuffer(durationBuffers[i]);
        gl.deleteBuffer(lapsedBuffers[i]);
        gl.deleteVertexArray(updateArrays[i]);
        gl.deleteTransformFeedback(feedbackBuffers[i]);
      }
    },
  };
};