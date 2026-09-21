import AppKit
import Foundation

struct SeededRandom {
    private var state: UInt32

    init(seed: UInt32) {
        state = seed
    }

    mutating func next() -> Double {
        state = state &* 1_664_525 &+ 1_013_904_223
        return Double(state) / 4_294_967_296.0
    }
}

struct ParticleSample {
    let x: UInt16
    let y: UInt16
    let red: UInt8
    let green: UInt8
    let blue: UInt8
    let alpha: UInt8
}

guard CommandLine.arguments.count == 3 else {
    FileHandle.standardError.write(Data("Usage: swift build_hero_particle_data.swift <input.png> <output.js>\n".utf8))
    exit(2)
}

let inputPath = CommandLine.arguments[1]
let outputPath = CommandLine.arguments[2]
let targetCount = 24_000
let sampleHeight = 460

guard let sourceImage = NSImage(contentsOfFile: inputPath) else {
    FileHandle.standardError.write(Data("Could not load \(inputPath)\n".utf8))
    exit(3)
}

var sourceRect = NSRect(origin: .zero, size: sourceImage.size)
guard let sourceCGImage = sourceImage.cgImage(forProposedRect: &sourceRect, context: nil, hints: nil) else {
    FileHandle.standardError.write(Data("Could not decode \(inputPath)\n".utf8))
    exit(4)
}

let sourceAspect = Double(sourceCGImage.width) / Double(sourceCGImage.height)
let sampleWidth = max(1, Int((Double(sampleHeight) * sourceAspect).rounded()))
let bytesPerRow = sampleWidth * 4
var pixels = [UInt8](repeating: 0, count: bytesPerRow * sampleHeight)

let drewImage = pixels.withUnsafeMutableBytes { rawBuffer -> Bool in
    guard let context = CGContext(
        data: rawBuffer.baseAddress,
        width: sampleWidth,
        height: sampleHeight,
        bitsPerComponent: 8,
        bytesPerRow: bytesPerRow,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
    ) else {
        return false
    }

    context.interpolationQuality = .high
    context.translateBy(x: 0, y: CGFloat(sampleHeight))
    context.scaleBy(x: 1, y: -1)
    context.draw(sourceCGImage, in: CGRect(x: 0, y: 0, width: sampleWidth, height: sampleHeight))
    return true
}

guard drewImage else {
    FileHandle.standardError.write(Data("Could not create the sampling canvas\n".utf8))
    exit(5)
}

var random = SeededRandom(seed: 20_260_921)
var samples: [ParticleSample] = []
samples.reserveCapacity(targetCount)
var candidateCount = 0

for y in 0..<sampleHeight {
    for x in 0..<sampleWidth {
        let pixelIndex = y * bytesPerRow + x * 4
        let alpha = pixels[pixelIndex + 3]
        if alpha < 9 {
            continue
        }

        candidateCount += 1
        let unpremultiply = { (component: UInt8) -> UInt8 in
            guard alpha > 0 else { return 0 }
            return UInt8(min(255, Int(component) * 255 / Int(alpha)))
        }
        let sample = ParticleSample(
            x: UInt16((Double(x) / Double(max(1, sampleWidth - 1)) * 65_535).rounded()),
            y: UInt16((Double(y) / Double(max(1, sampleHeight - 1)) * 65_535).rounded()),
            red: unpremultiply(pixels[pixelIndex]),
            green: unpremultiply(pixels[pixelIndex + 1]),
            blue: unpremultiply(pixels[pixelIndex + 2]),
            alpha: alpha
        )

        if samples.count < targetCount {
            samples.append(sample)
        } else {
            let replacementIndex = Int(random.next() * Double(candidateCount))
            if replacementIndex < targetCount {
                samples[replacementIndex] = sample
            }
        }
    }
}

guard samples.count >= 800 else {
    FileHandle.standardError.write(Data("The portrait yielded only \(samples.count) visible samples\n".utf8))
    exit(6)
}

if samples.count > 1 {
    for index in stride(from: samples.count - 1, through: 1, by: -1) {
        let swapIndex = Int(random.next() * Double(index + 1))
        samples.swapAt(index, swapIndex)
    }
}

var packed = [UInt8]()
packed.reserveCapacity(samples.count * 8)
for sample in samples {
    packed.append(UInt8(sample.x & 0x00ff))
    packed.append(UInt8(sample.x >> 8))
    packed.append(UInt8(sample.y & 0x00ff))
    packed.append(UInt8(sample.y >> 8))
    packed.append(sample.red)
    packed.append(sample.green)
    packed.append(sample.blue)
    packed.append(sample.alpha)
}

let base64 = Data(packed).base64EncodedString()
let javascript = """
/* Generated from assets/images/home-character.PNG by scripts/build_hero_particle_data.swift. */
window.HERO_PARTICLE_DATA = Object.freeze({
  version: 1,
  count: \(samples.count),
  stride: 8,
  sampleWidth: \(sampleWidth),
  sampleHeight: \(sampleHeight),
  bytes: "\(base64)"
});
"""

do {
    try javascript.write(toFile: outputPath, atomically: true, encoding: .utf8)
    print("Wrote \(samples.count) particles (\(packed.count) packed bytes) to \(outputPath)")
} catch {
    FileHandle.standardError.write(Data("Could not write \(outputPath): \(error)\n".utf8))
    exit(7)
}
