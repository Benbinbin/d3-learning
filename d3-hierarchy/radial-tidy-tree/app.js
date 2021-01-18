// 设置布局的节点尺寸，由于渲染的是水平布局树图，在设置坐标或宽高是部分函数在传递参数值时可能需要对调

d3.json('data.json').then(data => {
  /**
  * 结构化数据
  * d3.hierarchy()
  */
  root = d3.hierarchy(data);

  /**
   * 预设参数和构建 svg 相关元素的容器
   */
  const width = document.documentElement.clientWidth; // <svg> 元素的固定宽度
  const height = document.documentElement.clientHeight // <svg> 元素的固定高度
  // 创建 svg 元素，设置合适的视窗 viewBox 大小
  const svg = d3.create("svg")
    .style("font", "12px sans-serif")
    .attr("viewBox", [-width / 2, -height / 2, width, height])

  const container = svg.append('g')
  .attr("transform", "scale(0.8)")

  // 设置径向树布局参数
  radius = width > height ? height / 2 : width / 2 // 半径大小

  /**
   * 计算层次布局
   * d3.tree()
   */
  tree = d3.tree()
    .size([2 * Math.PI, radius]) // 设置径向树图的大小，使用基于角度的坐标系统 [360, radius]
    .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth)(root) // 设置相邻的两个节点（兄弟）之间的间隔，同父节点生成的同级子节点间隔为基本单位；而非同父节点生成的同级子节点间隔为 2 倍的基本单位；同时基于节点所在整个树的深度调整间隔（节点越深，如叶子节点，间隔较小）

  console.log(tree);
  /**
   * 绘制径向树图
   */
  // 绘制连线
  container.append("g")
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.5)
    .selectAll("path")
    // 为元素 <path> 绑定数据
    .data(root.links()) // 返回当前连线 links 数组, 其中每个 link 是一个定义了 source 和 target 属性的对象
    .join("path") // 将生成的 entering 选择集中数据占位元素挂载到容器 <g> 中，并合并到 updating 选择集
    .attr("d", d3.linkRadial()
      .angle(d => d.x)
      .radius(d => d.y)); // 使用 d3.shape 模块的 linkRadial() 方法生成径向 link，返回的 link 生成器中 {x, y} 分别对应于径向连线的 angle 和 radius，还需调用需要调用 link 生成器的方法 .angle() 和 .radius() 进行设置

  // 绘制节点
  container.append("g")
    .selectAll("circle")
    .data(root.descendants())
    .join("circle")
    // 将节点移动到指定的定位，使用径向坐标系统，节点的 d.x 是偏移的角度（弧度，需要转换为度数应用于 svg 的 rotate() 方法），节点的 d.y 是半径方向的距离
    .attr("transform", d => `
        rotate(${d.x * 180 / Math.PI - 90})
        translate(${d.y},0)
      `)
    .attr("fill", d => d.children ? "#555" : "#999")
    .attr("r", 2.5);

  // 绘制文本
  container.append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("stroke-linejoin", "round")
    .attr("stroke-width", 3)
    .selectAll("text")
    .data(root.descendants())
    .join("text")
    // 当节点偏移的角度大于 PI 就将字体方向调转
    .attr("transform", d => `
        rotate(${d.x * 180 / Math.PI - 90})
        translate(${d.y},0)
        rotate(${d.x >= Math.PI ? 180 : 0})
      `)
    .attr("dy", "0.31em")
    .attr("x", d => d.x < Math.PI === !d.children ? 6 : -6)
    .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
    .text(d => d.data.name)
    .clone(true).lower()
    .attr("stroke", "white");

  // 将创建的 <svg> 元素挂载到页面上
  d3.select("body").append(() => svg.node())
});