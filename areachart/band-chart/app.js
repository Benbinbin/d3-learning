// 参考自 https://observablehq.com/@d3/band-chart/2

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度
// margin 为前缀的参数
// 其作用是在 svg 的外周留白，构建一个显示的安全区，以便在四周显示坐标轴
const marginTop = 20;
const marginRight = 30;
const marginBottom = 30;
const marginLeft = 40;

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
// 数据来源网页 https://observablehq.com/@d3/band-chart/2 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/814a812d5caf8ff7764469b9d992cdf0/raw/1adacfb1566d014f040db08b8cc66d764fb7f8ae/temp.csv";

d3.csv(dataURL, d3.autoType).then((sftemp) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(sftemp);

  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是日期（时间），使用 d3.scaleUtc 构建一个时间比例尺（连续型比例尺的一种）
  // 该时间比例尺采用协调世界时 UTC，处于不同时区的用户也会显示同样的时间
  // 具体可以参考官方文档 https://d3js.org/d3-scale/time
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#时间比例尺-time-scales
  const x = d3.scaleUtc()
    // 设置定义域范围
    // 从数据集的每个数据点中提取出日期（时间），并用 d3.extent() 计算出它的范围
    .domain(d3.extent(sftemp, d => d.date))
    // 设置值域范围（所映射的可视元素）
    // svg 元素的宽度（减去留白区域）
    .range([marginLeft, width - marginRight]);

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（温度），使用 d3.scaleLinear 构建一个线性比例尺
  const y = d3.scaleLinear()
    // 设置定义域范围
    // [ymin, ymax] 其中 ymin 是每日最低气温的最小值， ymax 是每日最高气温的最大值
    // 另外还使用 continuous.nice(count) 方法编辑定义域的范围，通过四舍五入使其两端的值更「整齐」nice
    // 参数 count 一个数字，用于设置该比例尺所对应的坐标轴的刻度线数量（D3 会以此作为一个参考值，最终生成的刻度线数量可能与 count 不同，以便刻度划分更合理），从而影响了定义域的调整方式
    // 具体参考官方文档 https://d3js.org/d3-scale/linear#linear_nice
    .domain([d3.min(sftemp, d => d.low), d3.max(sftemp, d => d.high)]).nice(10)
    // 设置值域范围
    // svg 元素的高度（减去留白区域）
    .range([height - marginBottom, marginTop]);

  /**
   *
   * 绘制坐标轴
   *
   */
  // 绘制横坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将横坐标轴容器「移动」到底部
    .attr("transform", `translate(0,${height - marginBottom})`)
    // 横轴是一个刻度值朝下的坐标轴
    // 通过 axis.ticks(count) 设置刻度数量的参考值（避免刻度过多导致刻度值重叠而影响图表的可读性）
    // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
    .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))
    // 💡 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    // 👇 在后面使用纵坐标轴的刻度线来绘制
    .call(g => g.select(".domain").remove());
  // 💡 注意以上使用的是方法 selection.call(axis) 的方式来调用坐标轴对象（方法）
  // 会将选择集中的元素 <g> 传递给坐标轴对象的方法，作为第一个参数
  // 以便将坐标轴在相应容器内部渲染出来
  // 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call
  // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法

  // 绘制纵坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${marginLeft},0)`)
    // 纵轴是一个刻度值朝左的坐标轴
    .call(d3.axisLeft(y))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 复制了一份刻度线，用以绘制图中横向的网格参考线
    .call(g => g.selectAll(".tick line").clone()
      // 调整复制后的刻度线的终点位置（往右移动）
      .attr("x2", width - marginLeft - marginRight)
      .attr("stroke-opacity", 0.1)) // 调小参考线的透明度
    // 为坐标轴添加额外信息名称（一般是刻度值的单位等信息）
    .call(g => g.append("text")
      // 将该文本移动到坐标轴的顶部（即容器的左上角）
      .attr("x", -marginLeft)
      .attr("y", 10)
      .attr("fill", "currentColor") // 设置文本的颜色
      .attr("text-anchor", "start") // 设置文本的对齐方式
      .text("↑ Temperature (°F)")); // 设置文本内容

  /**
   *
   * 绘制面积图内的面积形状
   *
   */
  // 使用 d3.area() 创建一个面积生成器
  // 面积生成器会基于给定的数据生成面积形状
  // 调用面积生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/area
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#面积生成器-areas
  const area = d3.area()
    // 设置两点之间的曲线插值器，这里使用 D3 所提供的一种内置曲线插值器 d3.curveStep
    // 该插值效果是在两个数据点之间，生成阶梯形状的线段（作为面积图的边界）
    // 具体效果参考 https://d3js.org/d3-shape/curve#curveStep
    .curve(d3.curveStep)
    // 设置下边界线横坐标读取函数
    // 该函数会在调用面积生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
    // 这里基于每个数据点的日期（时间）d.date 并采用比例尺 x 进行映射，计算出相应的横坐标
    .x(d => x(d.date))
    // 设置下边界线的纵坐标的读取函数
    // 这里的面积图的下边界线是每个数据点的最低气温 d.low，并采用比例尺 y 进行映射，得到纵坐标轴在 svg 中的坐标位置
    .y0(d => y(d.low))
    // 设置上边界线的纵坐标的读取函数
    // 这里的面积图的下边界线是每个数据点的最高气温 d.high，并采用比例尺 y 进行映射，得到纵坐标轴在 svg 中的坐标位置
    .y1(d => y(d.high));

  // 将面积形状绘制到页面上
  svg.append("path") // 使用路径 <path> 元素绘制面积形状
    .datum(sftemp) // 绑定数据
    // 将面积的填充颜色设置为蓝色
    .attr("fill", "steelblue")
    // 由于面积生成器并没有调用方法 area.context(parentDOM) 设置画布上下文
    // 所以调用面积生成器 area 返回的结果是字符串
    // 该值作为 `<path>` 元素的属性 `d` 的值
    .attr("d", area);
});
