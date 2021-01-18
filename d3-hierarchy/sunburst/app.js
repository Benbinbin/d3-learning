// 设置布局的节点尺寸，由于渲染的是水平布局树图，在设置坐标或宽高是部分函数在传递参数值时可能需要对调

d3.json('data.json').then(data => {
  /**
  * 结构化数据
  * d3.hierarchy()
  */
  root = d3.hierarchy(data)
    .sum(d => d.value) // !!! 在将结构化数据传递给 d3.partition() 之前必须调用 sum() 方法，以计算每个节点的后代节点累计值，这样 d3.partition() 才可以基于该值得出节点的区域大小
    .sort((a, b) => b.value - a.value); // 可选，对同级节点进行排序

  /**
   * 预设参数
   */
  // 构建 svg 相关元素的容器
  const width = document.documentElement.clientWidth; // <svg> 元素的固定宽度
  const height = document.documentElement.clientHeight // <svg> 元素的固定高度
  // 创建 svg 元素，设置合适的视窗 viewBox 大小
  const svg = d3.create("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, height])

  const container = svg.append('g')
    // .attr("transform", "scale(0.8)")

  // 预设颜色数组
  color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1))

  // 设置径向树布局参数
  radius = width > height ? height / 2 : width / 2 // 半径大小

  /**
   * 计算分区层次布局
   * d3.tree()
   */
  // 使用 d3.partition 模块用来生成邻接图（一个树图的变体），与使用线条链接父子节点不同，节点的层次关系以空间定位（邻近）表示相对关系，此外节点被编码为一个可度量的维度，可以更精确地比较节点之间的数据量。
  // 在这个布局中节点会被绘制为一个区域(可以是环形区域也可以是矩形区域)以表示该节点包含的数据量，父子节点的区域依次紧邻着，表示在层次结构中的相对关系。
  tree = d3.partition()
    .size([2 * Math.PI, radius])(root); // 旭日图是环形，采用角度坐标 [360, radius]
  // 对指定的结构数据计算分区层次布局，每个节点会被附加以下属性:
  // node.x0 - 矩形的左边缘
  // node.y0 - 矩形的上边缘
  // node.x1 - 矩形的右边缘
  // node.y1 - 矩形的下边缘

  /**
   * 绘制旭日图
   */
  // 基于分区层次布局数据使用 d3.shape 模块的 arc() 方法生成旭日图中每个节点对应的 annular 环形
  arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    // 设置同层级的环形之间的间隔 padAngle * padRadius，然后每个环形就会减去整个间隔距离，从而产生同层相邻环形之间间隙
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005)) // 设置同层环形之间的间隙角度，如果直接设置为常量，会让图形显得「不成比例」，应该基于环形大小按比例设置其两侧的间隙
    // 该样例取 (d.x1 - d.x0) / 2 弧度值和 0.005 之间较小的那个值作为间隔角度，可以基于环形大小按比例设置同时避免间隔过大
    .padRadius(radius / 2) // 设置同层环形之间的间隙宽度，默认是环形内外半径的平方和的算术平方根。样例设置为 radius/2 定量
    .innerRadius(d => d.y0)
    .outerRadius(d => d.y1 - 1) // 适当地缩短外半径，让每一层环形之间有一定间隔

  // 绘制环形
  container.append("g")
    .attr("fill-opacity", 0.6)
    .selectAll("path")
    // 将数据与 <path> 元素进行绑定
    .data(tree.descendants().filter(d => d.depth)) // 移除 depth = 0 的节点，即根节点
    .join("path")
    .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
    .attr("d", arc) // 基于数据得到环形路径
    // svg 中的 <title> 元素是可以在鼠标悬浮在其父元素时显示的内容
    .append("title")
    .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}`); // 显示的内容是当前节点对应的祖先节点「路径」

  // 绘制文本
  container.append("g")
    .attr("text-anchor", "middle")
    .style("font", "12px sans-serif")
    .selectAll("text")
    // 将数据与 <text> 元素进行绑定
    .data(tree.descendants().filter(d => d.depth && (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 10)) // 移除 depth = 0 的节点，即根节点，同时移除环形区域过小的节点，不添加文本
    .join("text")
    .attr("transform", function (d) {
      const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
      const y = (d.y0 + d.y1) / 2;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`; // 节点定位坐标（角度）超过 180 度时文本方向调转
    })
    .attr("dy", "0.25em")
    .text(d => d.data.name);

  // 将创建的 <svg> 元素挂载到页面上
  d3.select("body").append(() => svg.node())
});