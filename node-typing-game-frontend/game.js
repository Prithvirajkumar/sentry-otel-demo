// Node.js terminal typing game with OpenTelemetry and Sentry instrumentation
const { trace, context } = require("@opentelemetry/api");

/**
 * Reports an exception to Sentry, attaching OTel trace context from the active span.
 * Uses Sentry.withScope to avoid leaking context between requests.
 */
function captureExceptionWithOtel(err) {
  Sentry.withScope((scope) => {
    const otelSpan = trace.getSpan(context.active());
    if (otelSpan) {
      const sc = otelSpan.spanContext();
      const traceId =
        sc.traceId.length === 32 ? sc.traceId : sc.traceId.padStart(32, "0");
      if (typeof scope.setPropagationContext === "function") {
        scope.setPropagationContext({
          traceId,
          parentSpanId: sc.spanId,
        });
      }
    }
    Sentry.captureException(err);
  });
}
// Node.js terminal typing game with OpenTelemetry instrumentation
const { tracer, logger } = require("./otel");
const Sentry = require("./sentry");
const { fetchWords, checkSpelling, lastBackendTraceId } = require("./api");
const { NUM_WORDS } = require("./config");
const readline = require("readline");

let words = [];
let current = 0;
let correct = 0;
let startTime;

function getRandomWord() {
  // Always return 'dragon' on the third word
  if (current === 2) {
    return "dragon";
  }
  // Otherwise, random selection excluding 'dragon' on third word
  const availableWords =
    current === 2 ? words.filter((w) => w !== "dragon") : words;
  return availableWords[Math.floor(Math.random() * availableWords.length)];
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Prompts the user for a word, creates OTel spans for each session and input,
 * propagates context for distributed tracing, and reports errors to Sentry.
 */
function askWord(parentSpan) {
  // Start game session and emit OTel log
  if (current === 0) {
    startTime = Date.now();
    logger.emit({
      body: `Game started at ${new Date(startTime).toISOString()}`,
      severityNumber: 5,
      severityText: "INFO",
      attributes: { event: "game.start" },
    });
  }
  // End game session and emit OTel log
  if (current >= NUM_WORDS) {
    const totalTime = (Date.now() - startTime) / 1000;
    const endSpan = tracer.startSpan("game.end", { parent: parentSpan });
    endSpan.setAttribute("game.correct", correct);
    endSpan.setAttribute("game.total", NUM_WORDS);
    endSpan.setAttribute("game.time", totalTime);
    endSpan.setAttribute("game.wpm", (correct / totalTime) * 60);
    endSpan.end();
    logger.emit({
      body: `Game ended. Correct: ${correct}/${NUM_WORDS}, Time: ${totalTime.toFixed(
        2
      )}s, WPM: ${((correct / totalTime) * 60).toFixed(2)}`,
      severityNumber: 5,
      severityText: "INFO",
      attributes: {
        event: "game.end",
        correct,
        total: NUM_WORDS,
        time: totalTime,
      },
    });
    console.log(`\nGame Over!`);
    console.log(`Correct: ${correct}/${NUM_WORDS}`);
    console.log(`Time: ${totalTime.toFixed(2)} seconds`);
    console.log(`WPM: ${((correct / totalTime) * 60).toFixed(2)}`);
    rl.close();
    return;
  }
  // Create OTel span for word session and prompt user
  const word = getRandomWord();
  const wordSpan = tracer.startSpan("word.session", { parent: parentSpan });
  wordSpan.setAttribute("word", word);
  logger.emit({
    body: `Prompting word: ${word}`,
    severityNumber: 5,
    severityText: "INFO",
    attributes: { event: "word.prompt", word },
  });
  rl.question(`Type: ${word}\n> `, (answer) => {
    // Make word session span active for distributed trace
    context.with(trace.setSpan(context.active(), wordSpan), async () => {
      // Create OTel span for user input
      const inputSpan = tracer.startSpan("word.input", { parent: wordSpan });
      inputSpan.setAttribute("input", answer.trim());
      inputSpan.setAttribute("expected", word);
      logger.emit({
        attributes: {
          event: "word.input",
          input: answer.trim(),
          expected: word,
        },
      });
      let result = "wrong";
      try {
        // Check spelling via API, propagating OTel context
        result = await checkSpelling(word, answer.trim(), inputSpan);
      } catch (err) {
        // Simulate frontend exception only if backend returned 500 for 'dragon' + 'error'
        if (
          err.response &&
          err.response.status === 500 &&
          word === "dragon" &&
          answer.trim() === "error"
        ) {
          captureExceptionWithOtel(new Error("Simulated frontend exception"));
          console.error(
            "Simulated frontend exception (trace ID set from OTel span)"
          );
          console.log(
            "Simulated exception sent to Sentry with OTel trace context"
          );
          await Sentry.flush(2000);
        }
        // Emit OTel log for backend error
        logger.emit({
          body: `Error checking spelling on backend: ${err}`,
          severityNumber: 5,
          severityText: "ERROR",
          attributes: {
            event: "spelling.check.error",
            word,
            input: answer.trim(),
          },
        });
        // Report error to Sentry with OTel trace context
        captureExceptionWithOtel(err);
        if (err.response && err.response.data && err.response.data.trace_id) {
          console.log(
            "Exception sent to Sentry with trace ID:",
            err.response.data.trace_id
          );
          console.error("Critical backend error. Exiting application.");
          // Ensure Sentry flushes before exit
          Sentry.flush(2000).then(() => {
            process.exit(1);
          });
        } else {
          const spanContext = inputSpan.spanContext();
          const localTraceId = spanContext && spanContext.traceId;
          console.log("Exception sent to Sentry with trace ID:", localTraceId);
        }
      }
      if (result === "correct") {
        correct++;
        inputSpan.setAttribute("result", "correct");
        logger.emit({
          body: `Correct word typed: ${word}`,
          severityNumber: 5,
          severityText: "INFO",
          attributes: { event: "word.result", result: "correct", word },
        });
        console.log("Correct!");
      } else {
        inputSpan.setAttribute("result", "wrong");
        logger.emit({
          body: `Wrong word typed: ${answer.trim()} (expected: ${word})`,
          severityNumber: 5,
          severityText: "ERROR",
          attributes: {
            event: "word.result",
            result: "wrong",
            input: answer.trim(),
            expected: word,
          },
        });
        console.log(`Wrong! The word was: ${word}`);
      }
      inputSpan.end();
      wordSpan.end();
      current++;
      askWord(parentSpan);
    });
  });
}

async function startGame() {
  const mainSpan = tracer.startSpan("game.start");
  console.log("Welcome to the Node.js Terminal Typing Game!");
  console.log(`Type the word shown. There are ${NUM_WORDS} words.\n`);
  try {
    words = await fetchWords(mainSpan);
    askWord(mainSpan);
  } catch (err) {
    console.error("Failed to fetch words from backend", err);
    process.exit(1);
  }
}

startGame();
