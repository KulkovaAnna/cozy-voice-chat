// SpeechDetection.ts is a module that exports the SpeechDetection class
// This class handles the voice activity detection functionality

interface SpeechDetectionConstructor {
  speakingThreshold?: number;
  silenceThreshold?: number;
  onUpdate: (status: boolean) => void;
}

export class SpeechDetection {
  speakingThreshold: number;
  isCurrentlySpeaking: boolean;
  silenceThreshold: number;
  private onUpdate: (status: boolean) => void;
  private silenceTimer: number | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;

  // The constructor initializes the class with options
  constructor(options: SpeechDetectionConstructor) {
    this.speakingThreshold = options.speakingThreshold || 7;
    this.isCurrentlySpeaking = false;
    this.silenceThreshold = options.silenceThreshold || 1000;
    this.onUpdate = options.onUpdate;
  }

  start(stream: MediaStream) {
    this.handleStream.call(this, stream);
  }

  // The handleStream method sets up the audio processing
  private handleStream(stream: MediaStream) {
    // Закрываем предыдущий контекст если есть
    this.stop();

    // Создаем новый аудио контекст
    this.audioContext = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    this.analyser = this.audioContext.createAnalyser();

    // Подключаем поток к анализатору
    const microphone = this.audioContext.createMediaStreamSource(stream);

    // Создаем обработчик для анализа аудио данных
    this.scriptProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);

    // Настраиваем анализатор
    this.analyser.smoothingTimeConstant = 0.8;
    this.analyser.fftSize = 256;
    this.analyser.minDecibels = -60;
    this.analyser.maxDecibels = -10;

    // Подключаем узлы
    microphone.connect(this.analyser);
    this.analyser.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);

    // Сохраняем контекст this для обработчика
    const processAudio = () => {
      this.processAudio();
    };

    this.scriptProcessor.onaudioprocess = processAudio;
  }

  // Метод для остановки детекции
  stop() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isCurrentlySpeaking = false;
  }

  // The processAudio method analyzes the audio data to detect voice activity
  private processAudio() {
    if (!this.analyser) return;

    // Создаем массив для временных данных (для анализа громкости)
    const dataArray = new Uint8Array(this.analyser.fftSize);

    // Получаем данные во временной области (громкость)
    this.analyser.getByteTimeDomainData(dataArray);

    // Вычисляем среднюю громкость
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const value = Math.abs(dataArray[i] - 128); // 128 - это тишина
      sum += value * value; // Используем квадрат для усиления различий
    }

    const average = Math.sqrt(sum / dataArray.length);
    const isSpeaking = average > this.speakingThreshold;

    // Если речь детектируется
    if (isSpeaking) {
      // Если мы еще не в состоянии речи, обновляем состояние
      if (!this.isCurrentlySpeaking) {
        this.isCurrentlySpeaking = true;
        this.onUpdate(true);
      }

      // Сбрасываем таймер тишины
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    } else {
      // Если речь не детектируется, но мы были в состоянии речи
      if (this.isCurrentlySpeaking && !this.silenceTimer) {
        this.silenceTimer = window.setTimeout(() => {
          this.isCurrentlySpeaking = false;
          this.onUpdate(false);
          this.silenceTimer = null;
        }, this.silenceThreshold);
      }
    }
  }
}
