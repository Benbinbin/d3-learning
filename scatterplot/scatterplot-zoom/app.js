/**
 *
 * 获取页面的长宽值
 *
 *
 */
const height = 600; // svg 的高度约束为 600px
let width = document.documentElement.clientWidth; // 获取页面宽度
const k = height / width; // 计算页面的长宽比例，用于缩放过程中校正数据点的尺寸

/**
 *
 * 随机生成的数据
 *
 */
const random = d3.randomNormal(0, 0.2); // 随机数生成函数，所产生的数值集合符合均值是 0，标准是 0.2 的约束
const sqrt3 = Math.sqrt(3);

// 生成 3 个列表（相当于有 3 个数据集）并合并 concat 为一个列表
// 每个数据集都随机生成 300 个数据点，共 900 个数据点
// 每个数据点都由 3 个元素构成
const data = [].concat(
  // 在生成数据点时附加了一些约束条件
  // 第一个数据集是在散点图中右上角蓝色的一类，它的横向均值是 Math.sqrt(3) 约 1.73 左右，纵轴均值是 1，数据点的最后一个元素都是 0
  // 第二个数据集是在散点图中左上角橙色的一类，它的横向均值是 -1.73 左右，纵向均值是 1，数据点的最后一个元素是 1
  // 第三个数据集是在散点图中下方绿色的一类，它的横向均值是 0，纵向均值是 -1，数据点的最后一个元素是 2
  // 根据最后一个元素，就可以将这些数据点进行区分（映射为不同的颜色），在散点图中表现为相同数据集的数据点聚类在一起
  Array.from({ length: 300 }, () => [random() + sqrt3, random() + 1, 0]),
  Array.from({ length: 300 }, () => [random() - sqrt3, random() + 1, 1]),
  Array.from({ length: 300 }, () => [random(), random() - 1, 2])
);

/**
 *
 * 比例尺与坐标轴
 *
 */
// X 轴比例尺
// 通过线性比例尺将数据范围与页面的横向宽度进行映射
const x = d3.scaleLinear().domain([-4.5, 4.5]).range([0, width]);

// Y 轴比例尺
// 通过线性比例尺将数据范围与页面的纵向宽度进行映射
const y = d3
  .scaleLinear()
  .domain([-4.5 * k, 4.5 * k])
  .range([height, 0]);

// 分类比例尺
// 将离散的数据映射为不同的颜色
// d3.schemeCategory10 是一个 Color Schemes
// 相关模块是 https://github.com/d3/d3-scale-chromatic/
const z = d3
  .scaleOrdinal()
  .domain(data.map((d) => d[2]))
  .range(d3.schemeCategory10);

// 基于比例尺绘制 X 坐标轴
const xAxis = (g, x) =>
  g
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisTop(x).ticks(12))
    .call((g) => g.select(".domain").attr("display", "none"));

// 基于比例尺绘制 Y 坐标轴
const yAxis = (g, y) =>
  g
    .call(d3.axisRight(y).ticks(12 * k))
    .call((g) => g.select(".domain").attr("display", "none"));

/**
 *
 * 创建图形
 *
 */
// 创建 svg（返回的是一个包含 svg 元素的选择集）
const svg = d3
  .select("#container")
  .append("svg")
  .attr("viewBox", [0, 0, width, height]);

// 创建数据点的容器
const g = svg.append("g").attr("fill", "none").attr("stroke-linecap", "round"); // 设置容器内的路径的收口形状是圆形，这对于后面使用 <path> 元素来绘制数据圆点有用

// 绘制数据点
g.selectAll("path")
  .data(data)
  .join("path")
  // 这里用了一点 tricky 方法来绘制数据点
  // 不是用 <circle> 元素，而是用 <path> 元素
  // 其中 d 属性的 Mx,y 是将画笔移动到数据点对应的 (x, y) 位置
  // 然后 h0 是将路径的延伸相对长度设置为 0（即路径的实际长度为 0）
  .attr("d", (d) => `M${x(d[0])},${y(d[1])}h0`)
  // 而真正绘制出圆点的是靠边框，颜色是根据 z 比例尺来设定，不同的数据集（聚类）采用不同的颜色，共有 3 种颜色
  .attr("stroke", (d) => z(d[2]));

// 创建 X 坐标轴的容器
const gx = svg.append("g");

// 创建 Y 坐标轴的容器
const gy = svg.append("g");

/**
 *
 * 缩放交互
 *
 */
// 缩放事件的回调函数
// 移动数据点的定位，并校正数据点的大小尺寸
const zoomed = (event) => {
  const { transform } = event; // 从回调函数的事件中解构出当前的缩放变换值
  g.attr("transform", transform) // 将缩放变换值应用到数据点的容器 <g> 上（作为 CSS transform 的值），整体进行变换
    .attr("stroke-width", 5 / transform.k); // 校正数据点的尺寸（路径的默认值宽度为 5，由于放大了数据点，所以要对路径的宽度进行校正）
  // 使用 transform.rescaleX 方法对比例尺重新构建
  // 返回一个定义域经过缩放变换的比例尺（这样映射关系就会相应的改变，会考虑上缩放变换对象 transform 的缩放比例）
  // 并用新的比例尺重绘 X 轴和 Y 轴
  gx.call(xAxis, transform.rescaleX(x));
  gy.call(yAxis, transform.rescaleY(y));
};

// 创建缩放器
const zoom = d3.zoom().on("zoom", zoomed);

// 调用 zoom.transform 方法执行缩放（以得到缩放后的变换对象）
// 将缩放对象存储到 svg 上
// 将当前选中的数据集所对应的变换对象作为（第二个）参数传递进去
// 因为通过 call 来调用，所以实际上 zoom.transform 的第一个参数是 svg 选择集
// zoom.transform(selection, transform[, point])
svg.call(zoom);

// 因为初始化时，并没有绘制坐标轴，以及设置数据点的大小（<path> 的宽度）
// 先通过 zoom.transform 方法执行一次（编程式）缩放，以初始化这些参数
// 其中使用 d3.zoomIdentity 标准缩放变换对象作为初次缩放的值
svg.call(zoom.transform, d3.zoomIdentity);
