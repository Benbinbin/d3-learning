// 参考自 https://observablehq.com/@benbinbin/zoomable-bar-chart
// 与缩放操作相关的核心逻辑
// 封装为一个函数
function zoom(svg) {
  // 缩放事件的回调函数
  function zoomed(event) {
    // 更改横轴的比例尺
    // 调用缩放变换对象 event.transform 的方法 event.transform.applyX(d)
    // 传入的是原始的横坐标 d 通过缩放变换对象处理，返回变换后的坐标
    // 所以 [xmin, xmax].map(d => event.transform.applyX(d)) 是基于原来的横轴值域，求出缩放变换后的新值域
    // 然后修改横坐标轴的比例尺的值域 x.range([newXmin, newXmax])
    // 💡 缩放时，值域与定义域的映射关系就改变了（页面上原来的某个位置对应于某个数据量的关系不成立了），需要更新比例尺，可以考虑改变值域（这里就是手动改变值域），也可以考虑改变定义域
    // 💡 其实 D3 提供了更简单的方法 transform.rescaleX(x) 或 transform.rescaleY(y)（通过改变定义域）更新比例尺
    // 💡 关于方法 transform.rescaleX(x) 或 transform.rescaleY(y) 的介绍可以参考这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-interact#缩放变换对象的方法
    x.range(
      [margin.left, width - margin.right].map((d) => event.transform.applyX(d))
    );
    // 使用新的比例尺调整条形图的柱子的定位（通过改变柱子的左上角的 x 值）
    // 以及调整条形图的柱子的宽度，通过新的比例尺 x.bandwidth() 获取
    svg
      .selectAll(".bars rect")
      .attr("x", (d) => x(d.name))
      .attr("width", x.bandwidth());
    // 使用新的比例尺重新绘制横坐标轴
    svg.selectAll(".x-axis").call(xAxis);
  }

  // 设置平移范围
  // extent 是一个嵌套数组，第一个元素是条形图的矩形区域的左上角，第二个元素是右下角
  const extent = [
    [margin.left, margin.top],
    [width - margin.right, height - margin.top]
  ];

  // 创建缩放器
  const zoomer = d3
    .zoom()
    // 约束缩放比例的范围，默认值是 [0, ∞]
    // 入参是一个数组 [1, 8] 表示最小的缩放比例是 1 倍，最大的缩放比例是 8 倍
    .scaleExtent([1, 8])
    // 约束平移的范围 translate extent，默认值是 [[-∞, -∞], [+∞, +∞]]
    // 这里设置为 extent 正好是条形图的柱子区域
    // 所以即使放大后，画布也只能在最左边的柱子和最右边的柱子之间移动
    .translateExtent(extent)
    // 设置视图范围 viewport extent
    // 如果缩放器绑定的是 svg，则视图范围 viewport extent 默认是 viewBox
    // 这里「校正」为条形图的柱子区域（不包含 margin 的区域）
    .extent(extent)
    .on("zoom", zoomed); // 缩放事件的回调函数
  // 🔎 以上提及的视图范围 viewport extent 和平移范围 translate extent 这两个概念，具体可以查看 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-interact

  svg.call(zoomer); // 为 svg 添加缩放事件监听器
}

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度
const margin = { top: 20, right: 20, bottom: 30, left: 20 };

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
// 数据来源网页 https://observablehq.com/@benbinbin/zoomable-bar-chart 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/04f66f9f466d8293c798cefdd8a36021/raw/1339d40a825dddce6c0720ddd01dbea66966577c/alphabet.csv";

d3.csv(dataURL, d3.autoType).then((data) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  /**
   *
   * 处理数据
   *
   */
  // 按照字母的使用频率进行降序排列
  const sortData = data
    .map(({ letter, frequency }) => ({ name: letter, value: +frequency }))
    .sort((a, b) => b.value - a.value);

  /**
   *
   * 构建坐标轴与比例尺
   *
   */
  // 横轴的比例尺
  // 横坐标轴的数据是条形图的各种分类，使用 d3.scaleBand 构建一个带状比例尺
  x = d3
    .scaleBand()
    .domain(sortData.map((d) => d.name)) // 横坐标轴的定义域是字母的名称，作为分类的类别
    .range([margin.left, width - margin.right]) // 横坐标轴的值域（可视化属性）是页面的宽度 [left, right]
    .padding(0.1); // 设置条形图中邻近柱子之间的间隔大小

  // 横坐标轴对象
  xAxis = (g) =>
    g
      // 通过设置 CSS 的 transform 属性将横坐标轴容器定位到底部
      .attr("transform", `translate(0,${height - margin.bottom})`)
      // 横轴是一个朝下的坐标轴
      // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
      .call(d3.axisBottom(x).tickSizeOuter(0));

  // 纵轴的比例尺
  // 纵坐标轴的数据是连续型的数值，默认使用 d3.scaleLinear 构建一个线性比例尺
  y = d3
    .scaleLinear()
    // 纵坐标轴的定义域 [ymin, ymax] 其中最大值 ymax 使用方法 d3.max() 从所有数据点的 y 值获取
    // 然后再通过 .nice() 编辑定义域的范围，通过四舍五入使其两端的值更「整齐」
    // 便于映射到值域的（刻度）值更具有可读性
    .domain([0, d3.max(sortData, (d) => d.value)])
    .nice()
    // ⚠️ 应该特别留意纵坐标轴的值域（可视化属性，这里是长度）范围 [bottom, top]
    // 由于 svg 的坐标体系中向下和向右是正方向，和我们日常使用的不一致
    // 所以这里的值域范围需要采用从下往上与定义域进行映射
    .range([height - margin.bottom, margin.top]);

  // 纵坐标轴对象
  yAxis = (g) =>
    g
      // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y)) // 纵轴是一个朝左的坐标轴
      .call((g) => g.select(".domain").remove()); // 删掉坐标轴的轴线（它含有 domain 类名）

  /**
   *
   * 绘制条形图
   *
   */
  // 绘制条形图内的柱子
  svg
    .append("g")
    .attr("class", "bars") // 为柱子的容器添加一个名为 "bars" 的 class 类名
    .attr("fill", "steelblue") // 设置柱子的填充颜色
    // 使用 <rect> 元素来绘制柱子
    // 通过设置矩形的左上角 (x, y) 及其 width 和 height 来确定其定位和形状
    .selectAll("rect")
    .data(sortData) // 绑定数据
    .join("rect")
    .attr("x", (d) => x(d.name)) // 柱子的左上角的横坐标
    .attr("y", (d) => y(d.value)) // 柱子的左上角的纵坐标
    // 柱子的高度
    // ⚠️ 应该特别留意因为在 svg 的坐标体系中向下和向右是正方向
    // 所以通过比例尺映射后，在 svg 坐标体系里，柱子底部的 y 值（即 y(0)）是大于柱子顶部的 y 值（即 y(d.value)），所以柱子的高度是 y(0) - y(d.value) 的差值
    .attr("height", (d) => y(0) - y(d.value))
    // 柱子的宽度
    // 通过横轴的比例尺的方法 x.bandwidth() 获取 band 的宽度（不包含间隙 padding）
    // 这里不需要通过索引值来获取每个柱子的宽度，因为每一个柱子的宽度都相同
    .attr("width", x.bandwidth());

  // 绘制横坐标轴
  svg
    .append("g")
    .attr("class", "x-axis") // 为横坐标轴容器添加一个名为 "x-axis" 的 class 类名
    .call(xAxis); // 调用坐标轴（对象）方法，将坐标轴在相应容器内部渲染出来

  // 在 svg 的左侧添加一个白色的矩形
  // 作为纵坐标轴的「背景」
  // 这样在放大条形图时，柱子即使会「延伸」到纵轴后，也会被白色矩形掩盖，并不会阻碍纵轴的显示
  svg
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", margin.left)
    .attr("height", height)
    .attr("fill", "white");

  // 绘制纵坐标轴
  svg
    .append("g")
    .attr("class", "y-axis") // 为纵坐标轴容器添加一个名为 "y-axis" 的 class 类名
    .call(yAxis); // 调用坐标轴（对象）方法，将坐标轴在相应容器内部渲染出来

  /**
   *
   * 调用 zoom 函数（并传入 svg 作为参数）
   */
  svg.call(zoom);
});
