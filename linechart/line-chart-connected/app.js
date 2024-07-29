// 参考自 https://observablehq.com/@d3/connected-scatterplot/2

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度
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
// 数据来源网页 https://observablehq.com/@d3/connected-scatterplot/2 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/c14ccf52abd47c3d4bde0890ace01343/raw/65faff1c8d6fecd02d77652ae67be97d2b6c0016/driving.csv";

d3.csv(dataURL, d3.autoType).then((driving) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(driving);

  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是连续型的数值（人均每年驾驶英里数），使用 d3.scaleLinear 构建一个线性比例尺
  const x = d3.scaleLinear()
    // 设置定义域范围
    // 从数据集的每个数据点中提取出英里数 d.miles，并用 d3.extent() 计算出这些数据的范围
    // 另外还使用 continuous.nice() 方法编辑定义域的范围，通过四舍五入使其两端的值更「整齐」 nice（便于划分刻度）
    // 具体参考官方文档 https://d3js.org/d3-scale/linear#linear_nice
    .domain(d3.extent(driving, d => d.miles)).nice()
    // 设置值域范围（所映射的可视元素）
    // svg 元素的宽度（减去留白区域）
    .range([marginLeft, width - marginRight]);

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（每加仑油价），使用 d3.scaleLinear 构建一个线性比例尺
  const y = d3.scaleLinear()
    // 设置定义域范围
    // 从数据集的每个数据点中提取出油价值 d.gas，并用 d3.extent() 计算出这些数据的范围
    // 另外还使用 continuous.nice() 方法编辑定义域的范围，通过四舍五入使其两端的值更「整齐」 nice（便于划分刻度）
    .domain(d3.extent(driving, d => d.gas)).nice()
    // 设置值域范围（所映射的可视元素）
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
    .call(d3.axisBottom(x).ticks(width / 80))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 复制了一份刻度线，用以绘制图中纵向的网格参考线
    .call(g => g.selectAll(".tick line").clone()
      // 调整复制后的刻度线的终点位置（往上移动）
      .attr("y2", -height)
      .attr("stroke-opacity", 0.1))  // 调小参考线的透明度
    // 为坐标轴添加额外信息名称（一般是刻度值的单位等信息）
    .call(g => g.append("text")
      // 将该文本移动到坐标轴的一端（即 svg 的右下角）
      .attr("x", width - 4)
      .attr("y", -4)
      .attr("font-weight", "bold") // 设置字体粗细
      .attr("text-anchor", "end") // 设置文本的对齐方式
      .attr("fill", "currentColor") // 设置文本的颜色
      .text("Miles per person per year")); // 设置文本内容
  // 💡 注意以上通过方法 selection.call(axis) 的方式来调用坐标轴对象（方法）
  // 会将选择集（只包含一个元素 <g>）传递给坐标轴对象的方法，作为第一个参数
  // 以便将坐标轴在相应容器内部渲染出来
  // 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call
  // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法

  // 绘制纵坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${marginLeft},0)`)
    // 纵轴是一个刻度值朝左的坐标轴
    // 并使用坐标轴对象的方法 axis.ticks() 设置坐标轴的刻度数量和刻度值格式
    // 具体参考官方文档 https://d3js.org/d3-axis#axis_ticks
    // 其中第一个参数用于设置刻度数量，这里设置为 `null` 表示采用默认的刻度生成器
    // 而第二个参数用于设置刻度值格式，这里设置为 "$.2f" 表示将数值保留两位小数，并在前面添加金钱符号 $
    // 关于 D3 所提供的数值格式具体参考官方文档 https://d3js.org/d3-format
    .call(d3.axisLeft(y).ticks(null, "$.2f"))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 复制了一份刻度线，用以绘制图中横向的网格参考线
    .call(g => g.selectAll(".tick line").clone()
      .attr("x2", width) // 调整复制后的刻度线的终点位置（往右移动）
      .attr("stroke-opacity", 0.1)) // 调小参考线的透明度
    // 为坐标轴添加额外信息名称（一般是刻度值的单位等信息）
    // 这里并没有添加一个 <text> 元素
    // 而是复制坐标轴的最后一个刻度（通过 class 选择器 .tick:last-of-type）里面的 `<text>` 标签
    // 再调整其位置，并设置内容
    .call(g => g.select(".tick:last-of-type text").clone()
      .attr("x", 4) // 将文本向右边设置一点小偏移
      .attr("text-anchor", "start") // 设置文本的对齐方式
      .attr("font-weight", "bold") // 设置字体粗细
      .text("Cost per gallon")); // 设置文本内容

  /**
   *
   * 绘制折线图内的线段
   *
   */
  // 使用方法 d3.line() 创建一个线段生成器
  // 线段生成器会基于给定的坐标点生成线段（或曲线）
  // 具体可以参考官方文档 https://d3js.org/d3-shape/line
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#线段生成器-lines
  const line = d3.line()
    // 设置两点之间的曲线插值器（所以线段生成器除了可以绘制折线，还可以绘制曲线）
    // D3 提供了一系列的内置的曲线插值器，它们的区别和具体效果可以查看官方文档 https://d3js.org/d3-shape/curve
    // 这里就是使用了其中一个 d3.curveCatmullRom
    .curve(d3.curveCatmullRom)
    // 设置横坐标读取函数
    // 该函数会在调用线段生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
    // 这里基于每个数据点的英里数 d.miles 并采用比例尺 x 进行映射，计算出相应的横坐标
    .x(d => x(d.miles))
    // 设置纵坐标读取函数
    .y(d => y(d.gas));

  // 计算曲线的总长度
  // length 是一个 helper function 工具函数，用于计算 path 路径（折线/曲线的总长度），它会被用于实现 transition 过渡动效（基于属性 stroke-dasharray）
  // 传入的参数是一个字符串（它作为 <path> 元素的属性 `d` 的属性值，由线段生成器所生成）
  // 首先使用 d3.create(svg:path) 创建一个选择集，其中包含一个新建的 SVG <path> 元素
  // ⚠️ 如果创建的不是 HTML 元素（例如 `<svg>` 元素），而是其他的 SVG 类型的元素（例如 `<g>` 元素），需要显式地指明命名空间 svg，否则创建一个 HTML G 不标准的元素
  // 然后通过属性 `d` 设置路径形状
  // 再使用 selection.node() 获取该 <path> 元素
  // 使用 JavaScript 原生方法 SVGGeometryElement.getTotalLength() 获取路径的总长度（一个浮点数）
  function length(path) {
    return d3.create("svg:path").attr("d", path).node().getTotalLength();
  }

  // 调用线段生成器 line(driving) 返回的结果是字符串，该值作为 `<path>` 元素的属性 `d` 的值
  // 使用 length() 方法获取该路径的总长度
  const l = length(line(driving));

  // 将线段路径绘制到页面上
  svg.append("path")
    // 绑定数据
    // 这里采用 selection.datum(value) 为选择集中的每个元素上绑定的数据（该选择集里只有一个 <path> 元素）
    // 因为这里只需要使用一个 <path> 元素来绘制一条路径，作为折线/曲线
    // ⚠️ 它与 selection.data(value) 不同，该方法不会将数组进行「拆解」
    // 即这个方法不会进行数据与元素的一一对应链接计算,并且不影响索引，不影响（不产生）enter 和 exit 选择集
    // 而是将数据 value 作为一个整体绑定到选择的各个元素上，因此使用该方法选择集的所有 DOM 元素绑定的数据都一样
    // 具体参考官方文档 https://d3js.org/d3-selection/joining#selection_datum
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/module-api/d3-module-selection#绑定数据
    .datum(driving)
    // 只需要路径的描边作为折线，不需要填充，所以属性 fill 设置为 none
    .attr("fill", "none")
    // 设置描边颜色
    .attr("stroke", "black")
    // 设置描边宽度
    .attr("stroke-width", 2.5)
    .attr("stroke-linejoin", "round") // 设置折线之间的连接样式（圆角让连接更加平滑）
    .attr("stroke-linecap", "round") // 设置路径端点的样式
    // 通过属性 stroke-dasharray 设置路径（描边）的**点划线**的图案规则，作为路径展开动画的初始状态
    // 该属性值由一个或多个（用逗号或者空白隔开）数字构成
    // 这些数字组合会依次表示划线和缺口的长度
    // 即第一个数字表示划线的长度，第二个数表示缺口的长度，然后下一个数字又是划线的长度，依此类推
    // 如果该属性值的数字之和小于路径长度，则重复这个数字来绘制划线和缺口，这样就会出现规律的点划线图案
    // 这里首先将属性 stroke-dasharray 设置为 `0,${l}`
    // 即路径的划线部分为 0，全部都是缺口
    // 所以其效果是在过渡开始时，路径为空，即折线不可见
    .attr("stroke-dasharray", `0,${l}`)
    // 调用线段生成器，将所绑定的数据 driving 作为参数传递到方法 line() 中
    // 返回的结果是字符串，作为 `<path>` 元素的属性 `d` 的值
    .attr("d", line)
    // 设置过渡动效
    // 更改的属性是 stroke-dasharray
    .transition()
    .duration(5000) // 设置过渡的时间
    .ease(d3.easeLinear) // 设置缓动函数
    // 设置属性是 stroke-dasharray 过渡的最终状态 `${l},${l}`（其实也可以是 `${l},0` 最终效果一样）
    // 即路径的划线的长度和路径总长度相同，缺口也一样
    // 所以效果是过渡结束时，路径完全显示
    .attr("stroke-dasharray", `${l},${l}`);

  /**
   *
   * 绘制数据点
   *
   */
  svg.append("g")
    .attr("fill", "white") // 填充色为白色
    .attr("stroke", "black") // 描边为黑色
    .attr("stroke-width", 2) // 描边宽度
    // 使用 <circle> 元素（一个个小圆形）来绘制数据点
    .selectAll("circle")
    .data(driving) // 绑定数据
    .join("circle")
    // 定位各数据点
    .attr("cx", d => x(d.miles))
    .attr("cy", d => y(d.gas))
    .attr("r", 3); // 设置圆的半径大小

  /**
   *
   * 为数据点添加标注
   *
   */
  const label = svg.append("g")
    // 设置字体样式
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .selectAll()
    // 绑定数据
    .data(driving)
    // 使用 <text> 元素显式标注
    .join("text")
    // 使用 CSS 的属性 transform 将各个 <text> 元素定位到相应数据点的位置
    .attr("transform", d => `translate(${x(d.miles)},${y(d.gas)})`)
    .attr("fill-opacity", 0) // 设置透明状态，初始值为 0%，即一开始是隐藏的
    .text(d => d.year) // 设置文本内容
    // 设置文字的描边颜色为白色
    .attr("stroke", "white")
    // 设置文本的 fill 填充、stroke 描边、mark 标记的绘制顺序
    // 这里是先绘制描边，然后再是填充，避免白色描边遮挡了黑色的字体
    // 具体介绍查看 https://developer.mozilla.org/en-US/docs/Web/CSS/paint-order
    .attr("paint-order", "stroke")
    // 设置文字颜色
    .attr("fill", "currentColor")
    // 使用方法 selection.each(func) 让选择集中的每个元素都调用一次函数 func 以执行特定的操作
    // 这里的作用是根据各个数据点的属性 side 来设置文本的偏移值（避免文本标注遮挡折线）
    // d 是当前所遍历的元素所绑定的数据
    .each(function (d) {
      // this 指向当前所遍历的 DOM 元素
      const t = d3.select(this);
      // 根据数据点的属性 d.side 的值来设置标注文本的对齐方式和偏离量
      switch (d.side) {
        case "top": t.attr("text-anchor", "middle").attr("dy", "-0.7em"); break;
        case "right": t.attr("dx", "0.5em").attr("dy", "0.32em").attr("text-anchor", "start"); break;
        case "bottom": t.attr("text-anchor", "middle").attr("dy", "1.4em"); break;
        case "left": t.attr("dx", "-0.5em").attr("dy", "0.32em").attr("text-anchor", "end"); break;
      }
    });

  // 为标注信息设置透明度的过渡动效
  label.transition()
    // 为各个标注信息设置**不同**的延迟时间
    // 以实现标注信息的显式和路径的展开达到同步的效果
    // 参数 d 是当前所遍历的元素所绑定的数据，参数 i 是当前所遍历的元素在分组中的索引
    // 通过方法 line(driving.slice(0, i + 1)) 获取当前标注文本所对应的数据点，所在的路径
    // 然后再通过 length() 计算该路径的长度
    // 通过与总长度 l 相除得到相对值，用于计算需要延迟多长时间（路径正好延伸到该数据点）
    // duration - 125 做了一些小修正，在路径展开到来前，让标注信息提前一点点时间先显示
    .delay((d, i) => length(line(driving.slice(0, i + 1))) / l * (5000 - 125))
    .attr("fill-opacity", 1); // 设置透明度在过渡的最终状态为 1，即完全显示
});
