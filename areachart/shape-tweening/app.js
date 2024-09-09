// 参考自 https://observablehq.com/@d3/shape-tweening

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 设置 SVG 元素的尺寸
const width = 960; // svg 元素的宽度
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
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@d3/shape-tweening 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/80e2a506b0ece78e1f823a912fec4ebc/raw/2c39fc2da9248f575ad49047f97f217238cafaf2/california.json";

d3.json(dataURL).then((polygon) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(polygon);


  /**
   *
   * 数据处理
   *
   */
  // 构建一个投影器，将地理坐标数据转换为适合绘制到页面的数据（作为 svg <path> 元素的属性 d）
  // 具体介绍参考官方文档 https://d3js.org/d3-geo/conic#geoAlbers
  const projection = d3
    .geoAlbers() // 采用 Conic projection 圆锥投影
    // 调整地图的显示方式，以便更好地展示所关注的地理区域
    .rotate([120, 0]) // 设置投影旋转的角度，以便让某个特定区域成为投影的中心
    .center([0, 37.7]) // 设置投影的中心
    .scale(2700); // 缩放比例

  // 采用投影器对原始数据进行转换
  // 具体转换结果可查看 👇 后面一个 cell
  const coordinates0 = polygon.coordinates[0].map(projection);

  // 从圆周上进行采样，得到与多边形数量相同的数据点
  // 参数 coordinates 是一个数组，包含多边形上的一系列数据点
  // 具体结果可查看 👇 后面第二个 cell
  function circle(coordinates) {
    const circle = []; // 记录在圆周上采样的数据点

    let length = 0; // 表示当前迭代的多边形上的数据点距离第一数据点的距离
    const lengths = [length]; // 记录多边形是每个点与第一数据点的距离

    // 多边形上的第一个数据点
    let p0 = coordinates[0];
    let p1;
    let x;
    let y;
    let i = 0;
    // 多边形上的数据点的总数量
    const n = coordinates.length;

    // Compute the distances of each coordinate.
    // 通过循环所有数据点，计算多边形上的每个数据点（沿着多边形的外周）到第一数据点的距离
    while (++i < n) {
      // 当前所遍历的数据点 p1（则 p0 是前一个数据点）
      p1 = coordinates[i];
      // 当前数据点与前一个数据点的横坐标差值
      x = p1[0] - p0[0];
      // 当前数据点与前一个数据点的纵坐标差值
      y = p1[1] - p0[1];
      // 将前后两个数据点在页面上的距离，**累计**到 length 变量上
      // 即表示当前所遍历的数据点距离第一个数据点的距离
      lengths.push((length += Math.sqrt(x * x + y * y)));
      p0 = p1; // 将当前所遍历的数据点切换为前一个数据点
    }

    // 使用 d3-polygon 模块所提供的一系列方法，求出多边形一些特性
    const area = d3.polygonArea(coordinates); // 计算多边形的面积
    // 进而将圆形面积和地图形状面积设定为一样，基于此求出圆形的半径
    const radius = Math.sqrt(Math.abs(area) / Math.PI);
    const centroid = d3.polygonCentroid(coordinates); // 计算多边形的质心/重心，作为变换后的圆形的圆形

    // 角度偏移量，在圆周上的起始采样点所对应的角度（该角度的选取是任意的 ❓ ）
    const angleOffset = -Math.PI / 2; // TODO compute automatically
    let angle;
    // 将 2π（弧长）按照多边形的外周总长进行均分
    const k = (2 * Math.PI) / lengths[lengths.length - 1];

    // Compute points along the circle’s circumference at equivalent distances.
    // 计算出多边形各数据点变换到圆形时，在圆周上相应的点（所对应的角度值）
    // 实际是在圆周上采样，得到与多边形上相同数量的点，然后将圆形上的点与多边形周长上的点进行一一对应
    i = -1;
    while (++i < n) {
      // 结合变量 k，则 angle 完整表达式为 angleOffset + lengths[i] * (2 * Math.PI) / lengths[lengths.length - 1]
      // 其中 angleOffset 是初始偏移角度，即第一个采样点所对应的角度
      // 而将 lengths[i] * (2 * Math.PI) / lengths[lengths.length - 1] 看作 (2 * Math.PI) * (lengths[i] / lengths[lengths.length - 1])
      // 则 lengths[i] / lengths[lengths.length - 1] 表示第 i 个采样点所对应的多边形上的点与多边形上的第一个点的距离为 lengths[i]，与多边形的周长 lengths[lengths.length - 1] 的比值，表示多边形上的第 i 个点的距离占总长度的比例，将其与 (2 * Math.PI) 相乘，得到在圆周上的采样点相应的角度值
      angle = angleOffset + lengths[i] * k;

      // 基于圆心坐标和半径，以及该采样点的角度值，得到该采样点的坐标值 [x, y]
      circle.push([
        centroid[0] + radius * Math.cos(angle), // 横坐标值：圆心横坐标值 + r * cos(angle)
        centroid[1] + radius * Math.sin(angle) // 纵坐标值：圆心纵坐标值 + r * sin(angle)
      ]);
    }

    // 返回采样的结果
    return circle;
  }

  // 基于多边形的数据点，在圆周上进行采样得到数量相同的数据点
  const coordinates1 = circle(coordinates0);

  /**
   *
   * 绘制 path 路径
   *
   */
  // 创建 <path> 元素，用于绘制面积形状
  const path = svg.append("path").attr("fill", "#ccc").attr("stroke", "#333");

  // 基于数据点构造多边形（作为元素 <path> 的属性 `d` 的值）
  const d0 = "M" + coordinates0.join("L") + "Z"; // 多边形
  const d1 = "M" + coordinates1.join("L") + "Z"; // 圆形

  /**
   *
   * 创建切换动画
   *
   */
    loop(); // 开始切换形状

    // 异步操作，在执行完当前动画后，才开始新一轮的动画
    async function loop() {
      // 使用 <path> 元素将线面积形状绘制到页面上
      await path
        // 通过设置 `<path>` 元素的属性 `d` 绘制出路径的原始形状，多边形
        .attr("d", d0)
        // 设置过渡动效（通过更改 `<path>` 的属性 d 实现）
        // 通过 selection.transition() 创建过渡管理器
        // 过渡管理器和选择集类似，有相似的方法，例如为选中的 DOM 元素设置样式属性
        // 具体参考官方文档 https://d3js.org/d3-transition
        // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-transition
        .transition()
        .duration(5000) // 设置过渡的时间
        // 通过方法 `transition.attr(attrName, value)` 设置元素的属性 `attrName`，直接设置了目标值 `value`（过渡结束时的最终值），而不需要设置过渡期间各个时间点的值（因为 D3 会根据属性值的数据类型，自动调用相应插值器）
        // 关于方法 `transition.attr()` 的详细介绍可以参考这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-transition#过渡参数配置
        // 💡 另一类似的方法是 `transition.attrTween()` 也是用于设置元素的属性 `attrName`，都是自由度更高，可以自定义插值器 `factory` 用于进行插值计算，即计算过渡期间属性 `attrName` 在各个时间点的值
        .attr("d", d1)
        // 然后通过 `transition.transition()` 基于原有的过渡管理器所绑定的选择集合，创建一个新的过渡管理器
        // 新的过渡管理器会**继承了原有过渡的名称、时间、缓动函数等配置**
        // 而且新的过渡会**在前一个过渡结束后开始执行**
        // 一般通过该方法为同一个选择集合设置一系列**依次执行的过渡动效**
        .transition()
        .delay(5000) // 设置过渡的延迟/等待时间
        // 这里是将面积形状从圆形切换回多边形
        .attr("d", d0)
        // 最后通过方法 transition.end() 返回一个 Promise，仅在过渡管理器所绑定的选择集合的所有过渡完成时才 resolve
        // 这样就可以在当前的过渡结束时，才做执行后面操作（重复下一轮动画）
        .end();
      // 使用浏览器原生方法 requestAnimationFrame(callback) 告诉浏览器希望执行一个动画
      // 重新执行 loop 函数
      requestAnimationFrame(loop);
    }
});
