// 参考自 https://observablehq.com/@d3/path-tween

const d0 = "M0,0c100,0 0,100 100,100c100,0 0,-100 100,-100"; // 过渡开始时的 source path 原始路径
const d1 = "M0,0c100,0 0,100 100,100c100,0 0,-100 100,-100c100,0 0,100 100,100"; // 过渡结束时的 target path 目标路径

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 设置 SVG 元素的尺寸
const width = 928; // svg 元素的宽度
const height = 500; // svg 元素的高度

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 返回一个选择集，只有 svg 一个元素
const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height]);

/**
 *
 * 绘制路径
 *
 */
// 使用 <path> 元素将线段路径绘制到页面上
svg.append("path")
  // 通过设置 CSS 的 transform 属性将 <path> 元素移动到 svg 容器的中间
  .attr("transform", "translate(180,150)scale(2,2)")
  // 只需要路径的描边作为折线，不需要填充，所以属性 fill 设置为 none
  .attr("fill", "none")
  // 设置描边颜色，采用 "currentColor" 默认颜色（继承自父元素，这里是黑色）
  .attr("stroke", "currentColor")
  .attr("stroke-width", 1.5) // 设置描边宽度
  // 通过设置 `<path>` 元素的属性 `d` 绘制出路径的原始形状
  .attr("d", d0)
  // 设置过渡动效（通过更改 `<path>` 的属性 d 实现）
  // 通过 selection.transition() 创建过渡管理器
  // 过渡管理器和选择集类似，有相似的方法，例如为选中的 DOM 元素设置样式属性
  // 具体参考官方文档 https://d3js.org/d3-transition
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-transition
  .transition()
  .duration(2000) // 设置过渡的时间
  // 使用过渡管理器方法 transition.on(typeNames[, listener]) 监听过渡所分发的（自定义）事件，并执行相应的回调操作 listener
  // 这里监听 `"start"` 事件，它在过渡开始被分发，然后回调函数  repeat() 会被执行
  .on("start", function repeat() {
    // 在回调函数中 this 指向（在过渡管理器所绑定的选择集合中）当前所遍历的元素
    // 在这里的过渡管理器所绑定的选择集中只有一个 `<path>` 元素
    // 通过方法 d3.active(node[, name]) 获取指定元素的指定名称的执行中的过渡管理器
    // 使用过渡管理器方法 `transition.attrTween(attrName[, factory])` 设置元素的属性 `attrName`，可以自定义插值器 `factory` 用于进行插值计算，即计算过渡期间属性 `attrName` 在各个时间点的值
    // 这里更改的是 `<path>` 元素的属性 `d`，自定义了插值函数 pathTween() 该函数的具体代码实现可以查看 👇 下一个 cell
    // 💡 另一类似的方法是 `transition.attr(attrName, value)` 它也是用于设置元素的属性 `attrName`，但直接设置了目标值 `value`（过渡结束时的最终值），而不需要设置过渡期间各个时间点的值（因为 D3 会根据属性值的数据类型，自动调用相应插值器
    // 关于方法 `transition.attr()` 和 `transition.attrTween()` 的详细介绍可以参考这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-transition#过渡参数配置
    d3.active(this)
      // 这里的过渡动画的目的将路径形状从 d0 变换为 d1
      .attrTween("d", pathTween(d1, 4))
      // 然后通过 `transition.transition()` 基于原有的过渡管理器所绑定的选择集合，创建一个新的过渡管理器
      // 新的过渡管理器会**继承了原有过渡的名称、时间、缓动函数等配置**
      // 而且新的过渡会**在前一个过渡结束后开始执行**
      // 一般通过该方法为同一个选择集合设置一系列**依次执行的过渡动效**
      .transition()
      // 同样使用方法 `transition.attrTween()` 设置 `<path>` 元素的属性 `d`
      // 这里的过渡动画的目的将路径形状从 d1 恢复为 d0
      .attrTween("d", pathTween(d0, 4))
    // 再使用创建一个过渡管理器（它会接着上一个过渡动画结束时触发）
    .transition()
      // 又再一次调用 repeat() 函数
      .on("start", repeat);
    // 函数 repeat() 的作用是先将路径的形成再一次从 d0 切换为 d1，然后再恢复为 d0，最后又递归调用自身，形成循环动画，所以过渡动画的最终效果是路径在 d0 和 d1 形状之间不断切换
  });

// 该函数称为插值器工厂函数 interpolator factory，它生成一个插值器
// 💡 D3 在 d3-interpolate 模块提供了一些内置插值器，具体可以查看官方文档 https://d3js.org/d3-interpolate
// 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-transition#插值器
// 该函数接收两个参数，第一个参数 `d1` 是过渡的目标值/最终值，第二个参数 `precision` 是采样的精度
// 通过采样将路径从贝塞尔曲线转换为分段折线（便于插值计算）
function pathTween(d1, precision) {
  // 返回一个自定义的插值器
  return function () {
    // 函数内的 this 指向（在过渡管理器所绑定的选择集合中）当前所遍历的元素，在这个示例中选择集中只有一个 `<path>` 元素
    const path0 = this;
    // 通过 JS 原生方法 node.cloneNode() 拷贝该 DOM 元素
    const path1 = path0.cloneNode();
    // 将该 `<path>` 元素的属性 `d` 设置为 `d1`（过渡的目标值/最终值），所以该元素的形状与过渡完成时的路径形状一样
    path1.setAttribute("d", d1);
    // 使用方法 SVGGeometryElement.getTotalLength() 获取 `<path>` 元素的长度（以浮点数表示）
    const n0 = path0.getTotalLength(); // 过渡起始时路径的总长度
    const n1 = path1.getTotalLength(); // 过渡结束时路径的总长度

    // Uniform sampling of distance based on specified precision.
    // 基于给定的精度 precision 对（过渡前）path0 和（过渡后）path1 两个路径进行均匀采样
    // 💡 可以得到一系列配对的采样点（它们分别路径上某一点的起始状态和最终状态）
    // 💡 然后为**每对采样点（已知起始状态和最终值）构建一个插值器**，用于实现路径切换动画
    // 用一个数组 distances 来存储采样点（相对于路径的）位置，每一个元素都表示一个采样点
    // 即每个元素/采用点都是一个 0 到 1 的数字，它是采样点到该路径开头的距离与**该路径总长度**的比值（占比）
    // 💡 使用相对值来表示采样点的位置，以便将采样点进行配对
    const distances = [0]; // 第一个采样点是路径的起点
    // 对采样的精度/步长进行标准化，使用它进行迭代采样就可以得到采样点的相对（总路径）位置
    // 其中 precise 的单位是 px 像素，是采样精度的绝对值
    // 通过精度与路径的总长度作比 precise / Math.max(n0, n1) 将精度从绝对值转换为相对值
    // 其中路径总长度是基于变换前后最长的路径，以保证在较长的路径上的采样密度（数量）也是足够
    const dt = precision / Math.max(n0, n1);
    // 通过 while 循环进行采用，每次距离增加一个标准化的步长 dt
    let i = 0; while ((i += dt) < 1) distances.push(i);
    distances.push(1); // 最后一个采样点是路径的终点

    // Compute point-interpolators at each distance.
    // 遍历数组 distances 为不同的采样点构建一系列的插值器
    const points = distances.map((t) => {
      // t 为当前所遍历的采样点的位置的相对值（与它所在的路径总长度的占比）
      // 通过 t * n0 或 t * n1 可以求出该采样点距离 path0 或 path1 路径的起点的具体距离
      // 再使用 SVG 元素的原生方法 path.getPointAtLength(distance) 可以获取距离路径起点特定距离 distance 的位置的具体信息
      // 具体可以参考 https://developer.mozilla.org/en-US/docs/Web/API/SVGGeometryElement/getPointAtLength
      // 该方法返回一个 DOMPoint 对象，它表示坐标系中的 2D 或 3D 点，其中属性 x 和 y 分别描述该点的水平坐标和垂直坐标
      // 具体可以参考 https://developer.mozilla.org/en-US/docs/Web/API/DOMPoint
      // 在 path0（过渡开始时的路径）上的采样点作为插值的起始状态
      const p0 = path0.getPointAtLength(t * n0);
      // 在 path1（过渡结束时的路径）上的采样点作为插值的最终状态
      const p1 = path1.getPointAtLength(t * n1);
      // 所以 [p0.0, p0.y] 是插值的起点的坐标值，[p1.x, p1.y] 是插值的终点的坐标值
      // 这里使用 D3 所提供的内置通用插值器构造函数 d3.interpolate(a, b) 来构建一个插值器
      // 它会根据 b 的值类型自动调用相应的数据类型插值器
      // 具体可以参考这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-transition#通用类型插值器
      // 这里为每个采样位置构建出一个插值器，然后在过渡期间就可以计算出特定时间点该点运动到什么地方（即它的 x，y 坐标值）
      return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
    });

    // 插值器最后需要返回一个函数，它接受标准时间 t 作为参数（其值的范围是 [0, 1]）
    // 返回的这个函数会在过渡期间被不断调用，用于生成不同时间点的 `<path>` 元素的属性 `d` 的值
    // 当过渡未结束时（标准化时间 t < 1 时），通过调用一系列的插值器 points 计算各个采样点的运动到何处，并使用指令 `L` 将这些点连起来构成一个折线
    // 而过渡结束时（标准化时间 t = 1 时），将路径替换为真正的形状 d1（而不再使用采样点模拟生成的近似形状）
    return (t) => t < 1 ? "M" + points.map((p) => p(t)).join("L") : d1;
  };
}


