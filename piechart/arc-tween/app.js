// 参考自 https://observablehq.com/@d3/arc-tween

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // svg 元素的宽度，采用页面的宽度
// svg 元素的高，从 width 的一半和 500px 之间取最小值
const height = Math.min(500, width / 2);
const outerRadius = height / 2 - 10; // 环形图的外半径
const innerRadius = outerRadius * 0.75; // 环形图的内半径
// https://tauday.com/tau-manifesto
const tau = 2 * Math.PI; // 2π

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 返回一个选择集，只有 svg 一个元素
const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height]);

// 创建一个容器，在里面绘制环形图
const g = svg.append("g")
  // 通过设置 CSS 的 transform 属性将容器移到 svg 中间
  .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

/**
 *
 * 绘制环形图内的环状扇形形状
 *
 */
// 使用 d3.arc() 创建一个 arc 扇形生成器
// 扇形生成器会基于给定的数据生成扇形形状
// 调用扇形生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
// 具体可以参考官方文档 https://d3js.org/d3-shape/arc
// 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#扇形生成器-arcs
const arc = d3.arc()
  // 设置内半径，由于这里所传递的参数不为 0，所以生成环状扇形（如果参数为 0 则生成完整扇形）
  .innerRadius(innerRadius)
  // 设置外半径
  .outerRadius(outerRadius)
  // 设置扇形的一边的起始角度，作为起始角，单位是弧度
  // 这里采用固定值，为 0 即 12 点方向
  .startAngle(0);
// 💡 但这里并没有设置 endAngle（扇形的另一边的起始角度，作为结束角），因为它需要动态变化，在后面才进行设置

// 绘制一个完整的灰色圆环作为背景
const background = g.append("path") // 使用 <path> 路径元素来绘制圆环形状
  // 绑定数据，其中属性 endAngle 是用于设置扇形的结束角，弧度为 2π（即所绘制的环状的扇形是一个完整的圆环）
  .datum({endAngle: tau})
  .style("fill", "#ddd") // 设置填充颜色为灰色
  // 由于扇形生成器并没有调用方法 area.context(canvasContext) 设置画布上下文
  // 所以调用扇形生成器 arc 返回的结果是字符串
  // 该值作为 `<path>` 元素的属性 `d` 的值
  .attr("d", arc);

// 绘制一个橙色圆环作为前景
const foreground = g.append("path")  // 使用 <path> 路径元素来绘制圆环形状
  .datum({endAngle: 0.127 * tau}) // 扇形结束角的初始弧度值为 0.127 * 2π
  .style("fill", "orange") // 设置填充颜色为橙色
  // 调用扇形生成器 arc 返回的结果是字符串，作为 `<path>` 元素的属性 `d` 的值
  .attr("d", arc);

// 使用 d3.interval(callback, delay) 创建一个计时器，每间隔 1500ms 执行一次 callback 回调函数
// 具体介绍可以查看官方文档 https://d3js.org/d3-timer#interval
const interval = d3.interval(function() {
  // 每次达到间隔时间执行该回调，都会使用 selection.trasition() 创建一个新的过渡管理器
  foreground.transition()
      .duration(750) // 设置过渡的时间
      // 使用过渡管理器方法 `transition.attrTween(attrName[, factory])` 可以自定义元素属性 `attrName` 的插值方式
      // 其中 `factory` 称为插值器工厂函数，调用它就会生成一个插值器（插值器正是在过渡期间用于为属性 `attrName` 计算各个时间点的值）
      // 这里更改的是 `<path>` 元素的属性 `d`，与插值相关的逻辑封装到函数 arcTween() 中，这里调用它就会返回一个插值器工厂函数（该函数的具体代码在下文）
      // 💡 另一类似的方法是 `transition.attr(attrName, value)` 它也是用于设置元素的属性 `attrName`，但它是用于为元素的属性 `attrName` 直接设置目标值 `value`（（过渡结束时的最终值），而不需要设置过渡期间各个时间点的值（因为 D3 会根据属性值的数据类型，自动调用相应插值器）
      // 关于方法 `transition.attr()` 和 `transition.attrTween()` 的详细介绍可以参考这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-transition#过渡参数配置
      .attrTween("d", arcTween(Math.random() * tau));
}, 1500);

// 将与路径动态变化（插值）相关的逻辑封装为一个函数
// 该函数接收参数 newAngle 是过渡的目标值/最终值（随机生成的扇形新的结束角）
function arcTween(newAngle) {
  // 返回一个插值器工厂函数 interpolator factory，它最终生成/返回一个插值器（用于在过渡期间为属性 `attrName` 计算各个时间点的值）
  // 该工厂函数接收三个参数
  // * 当前元素绑定的数据 datum `d`
  // * 当前元素在选择集合中的索引 index `i`
  // * 选择集合 `nodes`
  // 而函数内的 this 指向当前遍历的元素（即 nodes[i]）
  // 这里传入的参数 d 就是 `<path>` 元素所绑定的数据 `{endAngle: number}`（一个对象，具有属性 `endAngle` 扇形当前/原来的结束角度）
  return function(d) {
    // 这里使用 D3 所提供的内置通用插值器构造函数 d3.interpolate(a, b) 来构建一个插值器
    // 它会根据 b 的值类型自动调用相应的数据类型插值器
    // 具体可以参考这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-transition#通用类型插值器
    // 这里是基于扇形新的结束角 newAngle（数值，表示弧度，所以会自动采用 d3.interpolateNumber）构建出一个插值器
    // 然后在过渡期间就可以计算出扇形结束角在特定时间点的弧度是什么
    // 💡 D3 在 d3-interpolate 模块还提供一些其他类型的内置插值器，具体可以查看官方文档 https://d3js.org/d3-interpolate
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-transition#插值器
    const interpolate = d3.interpolate(d.endAngle, newAngle);

    // 插值器工厂函数最后需要返回一个函数（即插值器），它接受标准时间 t 作为参数（其值的范围是 [0, 1]）
    // 返回的这个函数会在过渡期间（过渡动画的每一帧）被不断调用，用于生成不同时间点的 `<path>` 元素的属性 `d` 的值
    return function(t) {

      // 使用前面创建的插值器 interpolate 基于给定的标准时间 t，计算出扇形结束角在该时间点的弧度值
      // 并赋值给 `<path>` 元素所绑定的数据 d.endAngle（以更新该属性值，在下一帧就会以此作为过渡的初始值）
      d.endAngle = interpolate(t);

      // 然后将（更新后的）`<path>` 元素所绑定的数据传递给扇形生成器 arc，生成一个字符串（作为 `<path>` 元素的属性 `d` 的值）
      // 这样就可以基于新的（结束角）弧度更新扇形的形状
      return arc(d);
    };
  };
}
