// 设置布局的节点尺寸，由于渲染的是水平布局树图，在设置坐标或宽高是部分函数在传递参数值时可能需要对调

/**
 * 结构化数据
 * d3.hierarchy()
 */
root = d3.hierarchy({
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
// console.log(root);

/**
 * 预设参数和构建 svg 相关元素的容器
 */
// 设置树布局的节点尺寸
const dx = 15; // 固定垂直宽度
const width = 900; // <svg> 元素的固定宽度
const dy = width / (root.height + 1); // 每个节点的水平宽度基于节点的层级数计算得出

// 添加 x0、y0 属性，x0 表示纵轴的定位，y0 表示横轴的定位，该坐标是当节点作为 source 时，其子树「伸缩」的定位
// 根节点的这个坐标是初始化生成树时动效的起点
root.x0 = dy / 2;
root.y0 = 0;

// ！！！这一步修改树的结构，因此初始化的树并不是一棵完整的树
root.descendants().forEach((d, i) => {
  d.id = i; // 将数列的索引设置为节点的 id 属性，作为各节点添加唯一标识值，在后面将节点数据与 DOM 元素绑定时，作为 key 函数的返回值
  d._children = d.children; // 将每个节点的子树（如果有）存放到属性 _children 中，然后选择性地将 children 属性为 null 来实现子树的隐藏（但仍保留该属性，以区分是否为叶子节点）
  if (d.depth && d.data.name.length !== 7) d.children = null; // 为了演示，当节点不是根节点，且节点文本长度不为 7 时，隐藏其子树
});

// console.log(root);

// 创建 svg 元素，设置合适的视窗 viewBox 大小
const svg = d3.create("svg")
  .attr("viewBox", [-40, -10, width, dx]) // 这里视图设置为 dx 或 0 都没关系，因为 update 会基于节点数量来动态调整该值
  .style("font", "10px sans-serif")
// .style("user-select", "none"); // 这里限制用户选择节点字体

// 创建节点间连线的容器 <g>，并设置线条的样式
const gLink = svg.append("g")
  .attr("fill", "none")
  .attr("stroke", "#555")
  .attr("stroke-opacity", 0.4)
  .attr("stroke-width", 1.5);

// 创建节点间连线的容器 <g>，并设置鼠标悬浮时的样式
const gNode = svg.append("g")
  .attr("cursor", "pointer")
  .attr("pointer-events", "all");

/**
 * 响应用户操作（点击节点展开或搜索子树），重新计算数据的层次布局并渲染树图
 * 封装为一个函数便于不断调用（递归调用）
 */
function update(source, duration = 250) {
  // d3.js v6 版本已经删除了 d3.event 这个 API
  // const duration = d3.event && d3.event.altKey ? 2500 : 250; // 当按住 alt 键点击节点，动画持续更长时间
  const nodes = root.descendants().reverse(); // 返回包含树中所有节点的数组，并进行倒序?
  const links = root.links(); // 返回包含树中所有的节点配对关系的数组
  /**
  * 计算修改后的 root 的层次布局
  * d3.tree()
  */
  // nodeSize([width, height]) 参数设定与垂直树相反
  d3.tree().nodeSize([dx, dy])(root);
  // console.log(root);

  /**
  * 绘制可交互树图
  */
  // 遍历修改后的树的所有节点，获取坐标（纵轴）范围，left 是最上方的节点，right 是最下方的节点
  let left = root;
  let right = root;
  root.eachBefore(node => {
    if (node.x < left.x) left = node;
    if (node.x > right.x) right = node;
  });
  // console.log(left, right);

  const height = right.x - left.x + dx * 2; // 根据节点当前计算 svg 的 viewBox 高度

  // 设置动效，主要是响应式地设置 svg 的 viewBox 高度以缩放展示完整的树图
  const transition = svg.transition()
    .duration(duration)
    .attr("viewBox", [-40, left.x - 10, width, height])
  // .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle")); // 使用 d3-transition 模块的 tween() 方法生成定制的补间动画

  /**
   * 更新节点
   */
  // 将节点数据绑定到 gNode 容器里的 <g> 元素上 ，获得 entering 结点集合（生成虚拟的数据占位元素）
  const node = gNode.selectAll("g")
    .data(nodes, d => d.id); // 使用 key 函数，为元素和数据设置唯一标识，便于元素的重用

  // 将数据占位元素挂载到 gNode 容器里
  const nodeEnter = node.enter().append("g")
    .attr("transform", d => `translate(${source.y0},${source.x0})`) // 新增节点的初始位置设置为 source 所在的位置（例如初始化第一次执行 update 函数时，source 位置就是前面在 root 根节点中硬编码的设置的 x0、y0 值，即该点就是树的起点）
    .attr("fill-opacity", 0)
    .attr("stroke-opacity", 0)
  // 为所有节点绑定点击事件，当用户点击节点时，切换 children 属性值（在 null 和预先设置的 _children 之间切换），！！！这会改变树的数据结构
  // .on("click", (event, d) => {
  //   d.children = d.children ? null : d._children;
  //   update(d); // 然后调用 update() 函数，传递当前点击的节点作为 source，因此新增或移除的节点的「伸缩」起点或终点就是父节点
  // });

  const hasChildrenNode = nodeEnter.filter((d) => {
    return d.data.children
  })

  // 为带有 children 属性的节点绑定点击事件，当用户点击节点时，切换 children 属性值（在 null 和预先设置的 _children 之间切换），！！！这会改变树的数据结构
  hasChildrenNode.on("click", (event, d) => {
    // console.log(event.altKey);
    duration = event.altKey ? 1000 : 250; // 预设动画持续时间是 250ms，当按住 alt 键点击节点，动画持续更长时间
    d.children = d.children ? null : d._children;
    update(d, duration);  // 然后调用 update() 函数，传递当前点击的节点作为 source，因此新增或移除的节点的「伸缩」起点或终点就是父节点
  });

  console.log(hasChildrenNode);

  // 为新增的节点添加圆形图标和文本
  nodeEnter.append("circle")
    .attr("r", 2.5)
    .attr("fill", d => d._children ? "#555" : "#999") // 判断是否有子节点，如果有就用深色 #555，否则用浅色 #999
    .attr("stroke-width", 10);

  nodeEnter.append("text")
    .attr("dy", "0.31em")
    .attr("x", d => d._children ? -6 : 6) // 如果是有子节点，文本向左偏移，否则向右偏移
    .attr("text-anchor", d => d._children ? "end" : "start") // 如果是有子节点，文本向左伸展，否则文本向右伸展
    .text(d => d.data.name)
    // 克隆文本为了添加白底和描边。使用 d3.selection 模块的 clone() 方法在所选元素之后插入所选元素的克隆（参数 true 表示采用深度拷贝，将 <text> 元素包裹的文本节点也复制），然后再用 lower() 方法将该插入的克隆移到父元素的顶部，作为第一个子元素（根据 svg 元素渲染顺序，作为「衬底」
    .clone(true).lower()
    .attr("stroke-linejoin", "round")
    .attr("stroke-width", 3)
    .attr("stroke", "white");

  // 将新增的节点移到层次布局计算得到的坐标上，使用前面预设的动效（同时响应式变更 svg 的 viewBox 高度）
  node.merge(nodeEnter).transition(transition)
    .attr("transform", d => `translate(${d.y},${d.x})`)
    .attr("fill-opacity", 1)
    .attr("stroke-opacity", 1);

  // 从页面上移除 exiting 结点集合（未绑定数据的旧 DOM 元素），使用前面预设的动效，节点缩回父节点处
  node.exit().transition(transition).remove()
    .attr("transform", d => `translate(${source.y},${source.x})`)
    .attr("fill-opacity", 0)
    .attr("stroke-opacity", 0);

  /**
  * 更新连线
  */
  // 将连线数据绑定到 gLink 容器里的 <path> 元素上 ，获得 entering 结点集合（生成虚拟的数据占位元素）
  const link = gLink.selectAll("path")
    .data(links, d => d.target.id); // 使用 key 函数，以数据的终点节点的 id 属性作为元素的唯一标识，便于元素的重用

  // 将数据占位元素挂载到 gNode 容器里
  const linkEnter = link.enter().append("path")
    .attr("d", d => {
      const o = { x: source.x0, y: source.y0 };
      // 使用 d3.linkHorizontal() 方法生成曲线（源点到目标点的光滑的三次贝塞尔曲线），终点和起点处的切线是水平方向的
      // 将 o 传递给 link 生成器，将新增连线的初始起点和终点都指定为 source 所在的位置，因此一开始是不可见
      return d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x)
        ({ source: o, target: o }); // 由于树图是水平方向，需要调用 link 生成器的方法 .x() 调换 x 和 y 值
    });

  // 将新增的连线根据基于「真实」的节点位置重新生成曲线，使用前面预设的动效（同时响应式变更 svg 的 viewBox 高度）
  link.merge(linkEnter).transition(transition)
    .attr("d", d3.linkHorizontal()
      .x(d => d.y)
      .y(d => d.x));

  // 从页面上移除 exiting 结点集合，使用前面预设的动效，节点缩回父节点处
  link.exit().transition(transition).remove()
    .attr("d", d => {
      const o = { x: source.x, y: source.y };
      return d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x)
        ({ source: o, target: o });
    });

  // 最后先序遍历当前树的所有节点，并为各个节点（主要是为新增的节点）都设置 x0、y0 属性，当节点作为 source 时其子树「伸缩」的定位
  root.eachBefore(d => {
    d.x0 = d.x;
    d.y0 = d.y;
  });
}

update(root);

// 将创建的 <svg> 元素挂载到页面上
// console.log(svg.node());
d3.select("body").append(() => svg.node())
