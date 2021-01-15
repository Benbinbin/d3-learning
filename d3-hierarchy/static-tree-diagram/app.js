// 设置布局的节点尺寸，由于渲染的是水平布局树图，在设置坐标或宽高是部分函数在传递参数值时可能需要对调

/**
 * ---Step1---
 * 结构化数据
 * d3.hierarchy()
 */
family = d3.hierarchy({
  name: "root",
  children: [
    { name: "child #1" },
    {
      name: "child #2",
      children: [
        { name: "grandchild #1" },
        { name: "grandchild #2" },
        { name: "grandchild #3" }
      ]
    }
  ]
})

console.log(family);

/**
 * ---Step2---
 * 计算层次布局
 * d3.tree()
 */
const width = 500;
const tree = (data) => {
  const root = data;
  // 设置树布局的节点尺寸
  root.dx = 15; // 固定垂直宽度
  root.dy = width / (root.height + 1);  // 水平宽度按照节点的「高度」（层级）进行均分
  // nodeSize([width, height]) 参数设定与垂直相反
  return d3.tree().nodeSize([root.dx, root.dy])(root);
}

let root = tree(family);
console.log(root);

/**
 * ---Step3---
 * 绘制静态树图
 */
// 遍历所有节点，获取坐标（纵轴）范围，x1 最大值，x0 最小值
let x0 = Infinity;
let x1 = -x0;
root.each(d => {
  if (d.x > x1) x1 = d.x;
  if (d.x < x0) x0 = d.x;
});

console.log(x0, x1);

// 创建 svg 元素，设置合适的视窗 viewBox 大小
const svg = d3.create("svg")
  .attr("viewBox", [0, 0, width, x1 - x0 + root.dx * 2]);

// 设置 svg 容器 <g> 内文本的样式，并进行适当的偏移，避免文本被遮挡
const g = svg.append("g")
  .attr("font-family", "sans-serif")
  .attr("font-size", 10)
  .attr("transform", `translate(${root.dy / 3},${root.dx - x0})`);

// 绘制节点间的连线，使用了 d3.shape 模块的 linkHorizontal() 方法
const link = g.append("g")
  .attr("fill", "none")
  .attr("stroke", "#98C379")
  .attr("stroke-opacity", 0.4)
  .attr("stroke-width", 1.5)
  .selectAll("path")
  .data(root.links()) // 为 <path> 元素绑定数据，root.links() 返回 node 的 links 数组，每个 link 是一个定义了 source 和 target 属性的对象
  .join("path")
  // 使用 d3.linkHorizontal() 方法生成曲线（源点到目标点的光滑的三次贝塞尔曲线），终点和起点处的切线是水平方向的
  // 指定
  .attr("d", d3.linkHorizontal()
    .x(d => d.y) // 由于树图是水平方向，需要调用 link 生成器的方法 .x() 调换 x 和 y 值
    .y(d => d.x));

console.log(root.links());

// 绘制节点
const node = g.append("g")
  .selectAll("g")
  .data(root.descendants()) // 为 <g> 元素绑定数据，root.descendants() 返回根节点的所有后代节点数组
  .join("g")
  .attr("transform", d => `translate(${d.y},${d.x})`); // 由于树图是水平方向，需要调偏移的 x 和 y 值

node.append("text")
  .attr("dy", "0.25em") // 元素默认定位在父元素 <g> 左上角，为了字体居中，需要将 <text> 向下偏移
  .attr("x", d => d.children ? -6 : 6) // 如果是有子节点，文本向左偏移，否则向右偏移
  .attr("text-anchor", d => d.children ? "end" : "start") // 如果是有子节点，文本向左伸展，否则文本向右伸展
  .text(d => d.data.name) // 使用 d3.selection 模块的 text() 方法为 <text> 元素设置文本
  // 克隆文本为了添加白底和描边。使用 d3.selection 模块的 clone() 方法在所选元素之后插入所选元素的克隆，然后再用 lower() 方法将该插入的克隆移到父元素的顶部，作为第一个子元素（根据 svg 元素渲染顺序，作为「衬底」
  .clone(true).lower()
  .attr("stroke-linejoin", "round")
  .attr("stroke-width", 3)
  .attr("stroke", "white");

node.append("circle")
  .attr("fill", d => d.children ? "#555" : "#999") // 判断是否有子节点，如果有就用深色 #555，否则用浅色 #999
  .attr("r", 2.5);

console.log(root.descendants());

// 将创建的 <svg> 元素挂载到页面上
// console.log(svg.node());
d3.select("body").append(() => svg.node())
