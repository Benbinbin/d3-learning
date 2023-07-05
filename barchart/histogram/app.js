// 参考自 https://observablehq.com/@d3/histogram/2

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度
// margin 为前缀的产生是在外四边留白，构建一个显示的安全区，以便在四周显示坐标轴
const marginTop = 20;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 40;

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 主要使用 d3-selection 模块的 API
// 具体可以参考 https://github.com/d3/d3-selection 或 https://d3js.org/d3-selection
// 使用方法 d3.create("svg") 创建一个 svg 元素，并返回一个选择集 selection
// 使用选择集的方法 selection.attr() 为选择集中的所有元素（即 <svg> 元素）设置宽高和 viewBox 属性
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
// 数据来源网页 https://observablehq.com/@d3/histogram/2 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/6ac7c033ed93f39ec9fa77d79e234900/raw/9938e4b3fbde7ff68719582516a7216e9a07e83d/unemployment-x.csv";

// 读取 csv 文件并载入其中的数据集作为一个数组
// 参考 d3-dsv 模块 https://github.com/d3/d3-dsv
// 每一个数据点都是一个对象
// 在绘制直方图时，采用对象的 rate 属性值作为分组的依据值
d3.csv(dataURL, d3.autoType).then((data) => {
  const unemployment = data
  /**
   *
   * 对原始数据 unemployment 进行转换
   *
   */
  // 使用 d3.bin() 将数据点进行分组/装箱，共有 50 个分组
  // 参考 d3-array 模块 https://github.com/d3/d3-array/tree/main#bins 或 https://d3js.org/d3-array/bin#bin
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#分组
  const bins = d3.bin()
    // 设置分组数量
    // 但实际生成的区间数量并不一定和入参一致
    // D3 会自动调整了分组数量，以提高区间的分割值（刻度值）的可读性
    .thresholds(40)
    // 将数据点的 d.rate 属性设置为分组的依据（而不是整个数据点对象）
    .value((d) => d.rate)
    (unemployment);
    // 该方法最后返回一个数组 bins
    // 数组的每个元素就是一个 bin（区间），它包含了属于该档次的样本数据，因此元素也是一个数组，所以每个元素（内嵌的数组）的长度就是该分组所包含的样本的数量
    // 此外每个 bin 还有两个特殊的属性（数组是对象特殊的对象，除了元素以外，D3 还为每个分组设置了属性）：
    // * x0 表示该分组 bin 的下限（包含）
    // * x1 表示该分组 bin 的上限（不包含，除非它是最后一个区间，则包含上限）

  /**
   *
   * 构建比例尺和坐标轴
   * 主要使用 d3-scale 和 d3-axis 模块的 API
   *
   */
  // 设置横坐标轴的比例尺
  // 使用方法 d3.scaleLinear() 构建一个线性比例尺
  // 将数据映射为可视元素的属性时所使用的比例尺
  // 具体可以参考 https://github.com/d3/d3-scale#linear-scales 或 https://d3js.org/d3-scale/linear
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#线性比例尺-linear-scales
  const x = d3.scaleLinear()
    // 设置横坐标轴的定义域范围
    // 以第一个分组 bin 的下限作为定义域范围的下限
    // 以最后一个分组 bin 的上限作为定义域范围的上限
    .domain([bins[0].x0, bins[bins.length - 1].x1])
    // 设置横坐标轴的值域范围（所映射的可视元素）
    // 以页面的宽度（扣除了外周的留白）作为范围，映射方向从左至右，和我们日常使用一致
    .range([marginLeft, width - marginRight]);

  // 设置纵坐标轴的比例尺，也是使用线性比例尺
  const y = d3.scaleLinear()
    // 设置纵坐标轴的定义域范围 [ymin, ymax]
    // 使用 d3.max(iterable[, accessor]) 方法获取
    .domain([0, d3.max(bins, (d) => d.length)])
    // ⚠️ 应该特别留意纵坐标轴的值域（可视化属性，这里是长度）范围 [bottom, top]
    // 由于 svg 的坐标体系中向下和向右是正方向，和我们日常使用的不一致
    // 所以这里的值域范围需要采用从下往上与定义域进行映射
    .range([height - marginBottom, marginTop]);

  // 绘制横坐标轴
  // 使用 svg.append("g") 在选择集 svg 的元素中（这个选择集只有 <svg> 元素），创建一个子元素 <g>
  // 以其作为一个容器（包含坐标轴的轴线和坐标刻度以及坐标值），然后返回包含该元素的选择集（即此时的选择集已经改变了）
  // 然后通过一系列的链式调用，主要是使用方法 selection.attr() 为选择集的元素（当前选择集包含的元素是 <g> 元素）设置属性
  svg.append("g")
    .attr("transform", `translate(0,${height - marginBottom})`) // 将横坐标轴容器定位到底部
    // 使用方法 d3.axisBottom(scale) 生成一个朝下的坐标轴（对象），即其刻度在水平轴线的下方
    // 调用坐标轴对象方法 axis.ticks() 设置坐标轴刻度的间隔（一般是设置刻度的数量 count）
    // 调用坐标轴对象方法 axis.tickSizeOuter([size]) 设置外侧刻度的长度，这里设为 0 就是取消坐标轴最外两侧的刻度线
    // 关于坐标轴具体可以参考 d3-axis 模块 https://github.com/d3/d3-axis 或 https://d3js.org/d3-axis
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#坐标轴
    // 💡 另外值得留意的一点是这里使用的方法 selection.call(func)
    // 💡 该方法会执行一次入参的函数 func，而且将选择集 selection 作为第一个入参传递给 func
    // 💡 这里传入的参数是坐标轴对象 axis
    // 💡 所以坐标轴对象实际上也是一个方法，接受一个 SVG 元素 context（一般是一个 <g> 元素），将坐标轴在其内部渲染出来
    // 💡 最后返回当前选择集，这样是为了便于后续进行链式调用
    // 💡 具体可以参考 https://github.com/d3/d3-selection#selection_call
    // 💡 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法
    .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))
    // 为坐标轴添加额外的标注信息（一般是刻度值的单位等信息）
    .call((g) => g.append("text")
      // 将该文本移动到坐标轴的右侧（即容器的右下角）
      .attr("x", width)
      .attr("y", marginBottom - 4)
      .attr("fill", "currentColor")
      .attr("text-anchor", "end") // 设置文本的对齐方式
      .text("Unemployment rate (%) →")); // 文本内容

  // 绘制横坐标轴
  // Add the y-axis and label, and remove the domain line.
  svg.append("g")
    // 这里将纵坐标容器稍微往左移动一点，让坐标轴绘制在预先留出的 margin 区域中
    .attr("transform", `translate(${marginLeft},0)`)
    // 使用方法 d3.axisLeft(scale) 生成一个朝左的坐标轴（对象），即其刻度在垂直轴线的左方
    .call(d3.axisLeft(y).ticks(height / 40))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call((g) => g.select(".domain").remove())
    // 为坐标轴添加额外的标注信息（一般是刻度值的单位等信息）
    .call((g) => g.append("text")
      .attr("x", -marginLeft)
      .attr("y", 10)
      .attr("fill", "currentColor")
      .attr("text-anchor", "start")
      .text("↑ Frequency (no. of counties)"));


  /**
   *
   * 绘制直方图的柱子
   *
   */
  svg.append("g")
    .attr("fill", "steelblue") // 设置柱子的颜色
    // 使用 selection.selectAll() 进行「二次选择」，其作用是构建一个空的选择集
    // 关于数据 D3 的数据绑定的流程可以参考以下链接里的笔记
    // datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#次级选择
    .selectAll()
    // 绑定数据
    // 使用前面所生成的分组数据
    // 这时候会创建一系列的「虚拟」占位元素添加到选择集里，它们与分组数据一一对应
    .data(bins)
    .join("rect") // 将元素绘制到页面上，使用 <rect> 元素来绘制柱子
    // 为每个矩形分别设置左上角 (x, y) 及其 width 和 height 来确定其定位和形状
    // 每个矩形条带的左上角横轴定位 x 由它所绑定的分组数据的下限 d.x0 所决定
    // 通过横坐标轴的比例尺 x(d.x0) 进行映射求出具体的横轴坐标值
    // 最后坐标轴还要加 1，相当于向右偏移 1 个像素点
    // 这样每个条带之间就会由一个小间隔，以便它们之间可以区分开来
    .attr("x", (d) => x(d.x0) + 1)
    // 每个条带的宽度则由它所绑定的分组数据的上限 d.x1 和 d.x0 所决定
    // 通过横坐标轴的比例尺 x(d.x1) 和 x(d.x0) 进行映射，分别求出具体的横轴坐标值，它们的差值就是条带的宽度
    // 最后还需要减 1，以便在每个条带之间预留间隙
    .attr("width", (d) => x(d.x1) - x(d.x0) - 1)
    // 每个矩形条带的左上角纵轴定位 y 由它所绑定的分组所包含的元素个数 d.length 所决定
    .attr("y", (d) => y(d.length))
    // 每个条带的高度也是由所绑定的分组所包含的元素个数 d.length 所决定
    .attr("height", (d) => y(0) - y(d.length));
});
