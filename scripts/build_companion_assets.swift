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

struct SparkSample {
    let x: UInt16
    let y: UInt16
    let red: UInt8
    let green: UInt8
    let blue: UInt8
}

func makePixels(from source: CGImage, width: Int, height: Int) -> [UInt8]? {
    let bytesPerRow = width * 4
    var pixels = [UInt8](repeating: 0, count: bytesPerRow * height)
    let drewImage = pixels.withUnsafeMutableBytes { buffer -> Bool in
        guard let context = CGContext(
            data: buffer.baseAddress,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRow,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
        ) else {
            return false
        }

        context.interpolationQuality = .high
        context.translateBy(x: 0, y: CGFloat(height))
        context.scaleBy(x: 1, y: -1)
        context.draw(source, in: CGRect(x: 0, y: 0, width: width, height: height))
        return true
    }
    return drewImage ? pixels : nil
}

func isColored(red: UInt8, green: UInt8, blue: UInt8, alpha: UInt8) -> Bool {
    let brightest = max(red, green, blue)
    let darkest = min(red, green, blue)
    return alpha > 28 && brightest > 42 && (brightest - darkest > 18 || Int(red) + Int(green) + Int(blue) > 210)
}

func boxBlur(_ input: [Int], width: Int, height: Int, radius: Int) -> [Int] {
    let kernelSize = radius * 2 + 1
    var horizontal = [Int](repeating: 0, count: input.count)
    var output = [Int](repeating: 0, count: input.count)

    for y in 0..<height {
        var sum = 0
        for x in 0...min(width - 1, radius) {
            sum += input[y * width + x]
        }
        for x in 0..<width {
            let addX = x + radius + 1
            let removeX = x - radius
            if addX < width {
                sum += input[y * width + addX]
            }
            if removeX >= 0 {
                sum -= input[y * width + removeX]
            }
            horizontal[y * width + x] = sum / kernelSize
        }
    }

    for x in 0..<width {
        var sum = 0
        for y in 0...min(height - 1, radius) {
            sum += horizontal[y * width + x]
        }
        for y in 0..<height {
            let addY = y + radius + 1
            let removeY = y - radius
            if addY < height {
                sum += horizontal[addY * width + x]
            }
            if removeY >= 0 {
                sum -= horizontal[removeY * width + x]
            }
            output[y * width + x] = sum / kernelSize
        }
    }

    return output
}

guard CommandLine.arguments.count == 4 else {
    FileHandle.standardError.write(Data("Usage: swift build_companion_assets.swift <input.png> <spark-data.js> <glow.png>\n".utf8))
    exit(2)
}

let inputPath = CommandLine.arguments[1]
let dataOutputPath = CommandLine.arguments[2]
let glowOutputPath = CommandLine.arguments[3]
let targetCount = 4_096

guard let sourceImage = NSImage(contentsOfFile: inputPath) else {
    FileHandle.standardError.write(Data("Could not load \(inputPath)\n".utf8))
    exit(3)
}

var sourceRect = NSRect(origin: .zero, size: sourceImage.size)
guard let source = sourceImage.cgImage(forProposedRect: &sourceRect, context: nil, hints: nil) else {
    FileHandle.standardError.write(Data("Could not decode \(inputPath)\n".utf8))
    exit(4)
}

let aspect = Double(source.width) / Double(source.height)
let sampleWidth = min(760, source.width)
let sampleHeight = max(1, Int((Double(sampleWidth) / aspect).rounded()))
guard let samplePixels = makePixels(from: source, width: sampleWidth, height: sampleHeight) else {
    FileHandle.standardError.write(Data("Could not create the sampling image\n".utf8))
    exit(5)
}

var random = SeededRandom(seed: 20_260_922)
var samples: [SparkSample] = []
samples.reserveCapacity(targetCount)
var candidateCount = 0

for y in 0..<sampleHeight {
    for x in 0..<sampleWidth {
        let index = (y * sampleWidth + x) * 4
        let red = samplePixels[index]
        let green = samplePixels[index + 1]
        let blue = samplePixels[index + 2]
        let alpha = samplePixels[index + 3]
        guard isColored(red: red, green: green, blue: blue, alpha: alpha) else {
            continue
        }

        candidateCount += 1
        let sample = SparkSample(
            x: UInt16((Double(x) / Double(max(1, sampleWidth - 1)) * 65_535).rounded()),
            y: UInt16(((1.0 - Double(y) / Double(max(1, sampleHeight - 1))) * 65_535).rounded()),
            red: red,
            green: green,
            blue: blue
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

guard samples.count >= 512 else {
    FileHandle.standardError.write(Data("Only \(samples.count) colored samples were found\n".utf8))
    exit(6)
}

for index in stride(from: samples.count - 1, through: 1, by: -1) {
    let swapIndex = Int(random.next() * Double(index + 1))
    samples.swapAt(index, swapIndex)
}

var packed = [UInt8]()
packed.reserveCapacity(samples.count * 7)
for sample in samples {
    packed.append(UInt8(sample.x & 0x00ff))
    packed.append(UInt8(sample.x >> 8))
    packed.append(UInt8(sample.y & 0x00ff))
    packed.append(UInt8(sample.y >> 8))
    packed.append(sample.red)
    packed.append(sample.green)
    packed.append(sample.blue)
}

let base64 = Data(packed).base64EncodedString()
let javascript = """
/* Generated from assets/images/companion-hedgehog.png by scripts/build_companion_assets.swift. */
window.COMPANION_SPARK_DATA = Object.freeze({
  version: 1,
  count: \(samples.count),
  stride: 7,
  bytes: "\(base64)"
});
"""

do {
    try javascript.write(toFile: dataOutputPath, atomically: true, encoding: .utf8)
} catch {
    FileHandle.standardError.write(Data("Could not write \(dataOutputPath): \(error)\n".utf8))
    exit(7)
}

let glowWidth = min(952, source.width)
let glowHeight = max(1, Int((Double(glowWidth) / aspect).rounded()))
guard let glowSourcePixels = makePixels(from: source, width: glowWidth, height: glowHeight) else {
    FileHandle.standardError.write(Data("Could not create the glow source\n".utf8))
    exit(8)
}

var originalGlowAlpha = [Int](repeating: 0, count: glowWidth * glowHeight)
for index in stride(from: 0, to: glowSourcePixels.count, by: 4) {
    let red = glowSourcePixels[index]
    let green = glowSourcePixels[index + 1]
    let blue = glowSourcePixels[index + 2]
    let sourceAlpha = glowSourcePixels[index + 3]
    guard isColored(red: red, green: green, blue: blue, alpha: sourceAlpha) else {
        continue
    }

    let brightest = Double(max(red, green, blue)) / 255.0
    originalGlowAlpha[index / 4] = min(255, Int((0.24 + brightest * 0.72) * 255.0))
}

var blurredGlowAlpha = originalGlowAlpha
for _ in 0..<3 {
    blurredGlowAlpha = boxBlur(blurredGlowAlpha, width: glowWidth, height: glowHeight, radius: 12)
}

var glowPixels = [UInt8](repeating: 0, count: glowWidth * glowHeight * 4)
for y in 0..<glowHeight {
    for x in 0..<glowWidth {
        let sourcePixelIndex = y * glowWidth + x
        let destinationPixelIndex = (glowHeight - 1 - y) * glowWidth + x
        let alpha = min(255, originalGlowAlpha[sourcePixelIndex] + Int(Double(blurredGlowAlpha[sourcePixelIndex]) * 1.35))
        let byteIndex = destinationPixelIndex * 4
        glowPixels[byteIndex] = UInt8(alpha)
        glowPixels[byteIndex + 1] = UInt8(alpha * 202 / 255)
        glowPixels[byteIndex + 2] = UInt8(alpha * 74 / 255)
        glowPixels[byteIndex + 3] = UInt8(alpha)
    }
}

let glowBytesPerRow = glowWidth * 4
guard let glowContext = CGContext(
    data: &glowPixels,
    width: glowWidth,
    height: glowHeight,
    bitsPerComponent: 8,
    bytesPerRow: glowBytesPerRow,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
), let glowImage = glowContext.makeImage(),
      let glowData = NSBitmapImageRep(cgImage: glowImage).representation(using: .png, properties: [:]) else {
    FileHandle.standardError.write(Data("Could not create the glow mask\n".utf8))
    exit(9)
}

do {
    try glowData.write(to: URL(fileURLWithPath: glowOutputPath), options: .atomic)
    print("Wrote \(samples.count) spark samples and \(glowWidth)x\(glowHeight) glow asset")
} catch {
    FileHandle.standardError.write(Data("Could not write \(glowOutputPath): \(error)\n".utf8))
    exit(10)
}
