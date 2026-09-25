import AppKit
let output = CommandLine.arguments[1]
try FileManager.default.createDirectory(atPath: output, withIntermediateDirectories: true)
let sword = [".............LLL", "............LWWL", "...........LWWL.", "..........LWWL..", ".........LWWL...", "........LWWL....", ".......LWWL.....", "......LWWL......", "..GG.LWWL.......", "..GGGLWL........", "...GGGL.........", "....GGGG........", "...HH.GGG.......", "..HH...GG.......", ".HH.............", "GG.............."]
let colors: [Character: String] = ["L":"7caaa0", "W":"e8f1cf", "G":"edbd66", "H":"aa7747"]
func color(_ hex:String) -> NSColor { let n=UInt32(hex,radix:16)!;return NSColor(srgbRed:CGFloat((n>>16)&255)/255,green:CGFloat((n>>8)&255)/255,blue:CGFloat(n&255)/255,alpha:1) }
func drawIcon(_ size:Int) throws {
 let rep=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:size,pixelsHigh:size,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
 let ctx=NSGraphicsContext(bitmapImageRep:rep)!
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=ctx
 ctx.cgContext.scaleBy(x:CGFloat(size)/64,y:CGFloat(size)/64)
 ctx.cgContext.translateBy(x:0,y:64);ctx.cgContext.scaleBy(x:1,y:-1)
 func rect(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ hex:String){color(hex).setFill();NSBezierPath(rect:NSRect(x:x,y:y,width:w,height:h)).fill()}
 color("12221d").setFill();NSBezierPath(roundedRect:NSRect(x:4,y:5,width:56,height:56),xRadius:13,yRadius:13).fill()
 color("293f30").setFill();NSBezierPath(roundedRect:NSRect(x:4,y:3,width:56,height:56),xRadius:13,yRadius:13).fill()
 color("718357").setStroke();let border=NSBezierPath(roundedRect:NSRect(x:5,y:4,width:54,height:54),xRadius:12,yRadius:12);border.lineWidth=1;border.stroke()
 color("1c3028").setFill();NSBezierPath(roundedRect:NSRect(x:8,y:7,width:48,height:48),xRadius:9,yRadius:9).fill()
 ctx.imageInterpolation = .none
 // A winding trail, tiny firs, and a sword with a warm golden hilt.
 rect(19,42,27,3,"344b34");rect(24,39,21,3,"344b34");rect(32,35,12,4,"344b34")
 for (x,y) in [(11,31),(46,36)] {rect(CGFloat(x+3),CGFloat(y),2,3,"607c48");rect(CGFloat(x+1),CGFloat(y+3),6,3,"527041");rect(CGFloat(x),CGFloat(y+6),8,3,"425e39");rect(CGFloat(x+3),CGFloat(y+9),2,3,"806441")}
 for (row,line) in sword.enumerated(){for (col,pixel) in line.enumerated(){if let hex=colors[pixel]{rect(CGFloat(16+col*2),CGFloat(12+row*2),2,2,hex)}}}
 for (x,y) in [(15,16),(45,26)] {rect(CGFloat(x),CGFloat(y-2),1,5,"d7d78e");rect(CGFloat(x-2),CGFloat(y),5,1,"d7d78e")}
 rect(30,49,4,2,"b1c280");rect(31,48,2,4,"b1c280")
 NSGraphicsContext.restoreGraphicsState()
 let data=rep.representation(using:.png,properties:[:])!
 try data.write(to:URL(fileURLWithPath:output+"/icon-\(size).png"))
}
for size in [16,32,64,128,256,512,1024]{try drawIcon(size)}
