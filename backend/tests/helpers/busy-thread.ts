// A thread script that never finishes and never lets go of the CPU, like a PDF that the reader
// cannot get through. Used to check that such work is stopped from outside.
for (;;) {
  Math.sqrt(Math.random());
}
