// 参考自 https://observablehq.com/@d3/stacked-bar-chart/2

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
// 数据来源网页 https://observablehq.com/@d3/stacked-bar-chart/2 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/af1c6678ca209296a3d7995829b553dd/raw/077c859be6023d915f3501a058aecc4efc9e60da/us-population-state-age.csv";

// 读取 csv 文件并载入其中的数据集作为一个数组
// 参考 d3-dsv 模块 https://github.com/d3/d3-dsv
d3.csv(dataURL, d3.autoType).then((data) => {
  // 读取原始数据后得到一个数组
  // D3 在解析 csv 表格生成数组时，为该数组添加了一个属性 columns，它也是一个数组，包含了表格的列属性
  // 返回的数组的每一元素都是一个对象，表示一个州的各个年龄段的人口数据
  // 这些对象中均包含 10 个属性，对应于 csv 表格中的 10 列
  // 表格的第一列是州的名称，对应于属性 name
  // 余下的 8 列都是不同的年龄段
  // console.log(data);
  // console.log(data.columns);

  /**
   *
   * 对数据进行转换
   *
   */
  // 求出各州的总人口，并作为 total 属性添加到 data 各个元素（对象）上
  // 在对条形图各条带进行排序，以及设置纵坐标轴的定义域时，都需要使用该值
  // 💡 其实后面所求出的系列数据 series，该数组的最后一个系列中（也是一个数组），各元素的堆叠顶部值 stackTop 就是各州的总人口
  data.forEach(element => {
    // element.total = total
    element.total = d3.sum(Object.values(element))
  });

  console.log(data);

  // 通过堆叠生成器对数据进行转换，便于后续绘制堆叠图
  // 返回一个数组，每一个元素都是一个系列（条形图中每个条带就是由多个系列堆叠而成的）
  // 💡 另外 D3 为每一个系列都设置了一个属性 key 其值是系列名称
  // 而每一个元素（系列）也是一个数组，其中每个元素是该系列在条形图的每个条带中的相应值，例如在本示例中，有 52 个州，所以每个系列会有 52 个数据点
  // 具体可以参考官方文档 https://d3js.org/d3-shape/stack 或 https://github.com/d3/d3-shape/blob/main/README.md
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#堆叠生成器-stacks
  const series = d3.stack()
    // 设置系列的名称（数组），即有哪几种年龄的分组
    // 通过 data 的属性 columns 提取年龄段
    // ⚠️ 注意只从第二个元素开始提取 data.columns.slice(1)
    // 因为 csv 表格的第一列是各州的名称 name ，并不是年龄段的分组
    // 可以提取到 9 个年龄段
    .keys(data.columns.slice(1))
    (data)

  console.log(series);

  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是条形图的各种分类，使用 d3.scaleBand 构建一个带状比例尺
  // 使用 d3-scale 模块
  // 具体参考官方文档 https://d3js.org/d3-scale/band 或 https://github.com/d3/d3-scale#scaleBand
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#带状比例尺-band-scales
  const x = d3.scaleBand()
    // 设置定义域范围（52 个州）
    // 使用 d3.union(data.map(d => d.name)) 从原数据中提取出州的名称的并集，并返回一个数组
    // 再使用 d3.sort() 对该数组的元素进行排序
    // 排序依据是各州的人口总和，按照降序排列，即人数较多的州排在前面
    .domain(d3.sort(d3.union(data.map(d => d.name)), (stateA, stateB)=> {
      const stateAElem = data.find(element => element.name === stateA)
      const stateBElem = data.find(element => element.name === stateB)

      if (stateAElem && stateBElem) {
        // 降序排列
        return d3.descending(stateAElem.total, stateBElem.total)
      } else {
        return 0
      }
    }))
    // 设置值域范围（所映射的可视元素）
    // svg 元素的宽度（减去留白区域）
    .range([marginLeft, width - marginRight])
    .padding(0.1); // 并设置间隔占据（柱子）区间的比例

  // console.log(x.domain());

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（各州的人口数量），使用 d3.scaleLinear 构建一个线性比例尺
  // 具体参考官方文档 https://d3js.org/d3-scale/linear 或 https://github.com/d3/d3-scale/tree/main#linear-scales
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#线性比例尺-linear-scales
  const y = d3.scaleLinear()
    // 设置定义域范围
    // [0, ymax] 其中 ymax 是各州人口累计值中的最大值
    // 通过 d3.max() 从数据 data 中获取各州人口总和的最大值
    .domain([0, d3.max(data, d => d.total)])
    // 设置值域范围
    // svg 元素的高度（减去留白区域）
    // 使用 continue.rangeRound() 方法，可以进行修约，以便实现整数（人口）映射到整数（像素）
    // ⚠️ 应该特别留意纵坐标轴的值域（可视化属性，这里是长度）范围 [bottom, top]
    // 由于 svg 的坐标体系中向下和向右是正方向，和我们日常使用的不一致
    // 所以这里的值域范围需要采用从下往上与定义域进行映射
    .rangeRound([height - marginBottom, marginTop]);

  // console.log(y.domain())

  // 设置颜色比例尺
  // 为不同系列设置不同的配色
  // 使用 d3.scaleOrdinal() 排序比例尺 Ordinal Scales 将离散型的定义域映射到离散型值域
  // 具体参考官方文档 https://d3js.org/d3-scale/ordinal 或 https://github.com/d3/d3-scale/tree/main#scaleOrdinal
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#排序比例尺-ordinal-scales
  const color = d3.scaleOrdinal()
    // 设置定义域范围
    // 各系列的名称，即 9 个年龄段
    .domain(series.map(d => d.key))
    // 设置值域范围
    // 使用 D3 内置的一种配色方案 d3.schemeSpectral
    // 它是一个数组，包含一些预设的颜色
    // 通过 d3.schemeSpectral[k] 的形式可以快速获取一个数组，其中包含 k 个元素，每个元素都是一个表示颜色的字符串
    // 其中 k 需要是 3~11 （包含）之间的数值
    // 具体参考官方文档 https://d3js.org/d3-scale-chromatic/diverging#schemeSpectral 或 https://github.com/d3/d3-scale-chromatic/tree/main#schemeSpectral
    // 这里根据系列的数量生成相应数量的不同颜色值
    .range(d3.schemeSpectral[series.length])
    // 设置默认颜色
    // 当使用颜色比例尺时 color(value) 传入的参数定义域范围中，默认返回的颜色值
    .unknown("#ccc");

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
    // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
    // 💡 注意这里使用的是方法 selection.call(axis) 的方式来调用坐标轴对象（方法）
    // 会将选择集（只包含一个元素 <g>）传递给坐标轴对象的方法，作为第一个参数
    // 以便将坐标轴在相应容器内部渲染出来
    // 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call 或 https://github.com/d3/d3-selection#selection_call
    // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法
    .call(d3.axisBottom(x).tickSizeOuter(0))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.selectAll(".domain").remove());

  // 绘制纵坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${marginLeft},0)`)
    // 纵轴是一个刻度值朝左的坐标轴
    // 并使用坐标轴对象的方法 axis.ticks() 设置坐标轴的刻度数量和刻度值格式
    // 具体参考官方文档 https://d3js.org/d3-axis#axis_ticks 或 https://github.com/d3/d3-axis/blob/v3.0.0/README.md#axis_ticks
    // 其中第一个参数用于设置刻度数量，这里设置为 `null` 表示采用默认的刻度生成器
    // 而第二个参数用于设置刻度值格式，这里设置为 "s" 表示数值采用 SI-prefix 国际单位制词头，例如 k 表示千，M 表示百万
    // 具体参考 https://en.wikipedia.org/wiki/Metric_prefix
    // 关于 D3 所提供的数值格式具体参考官方文档 https://github.com/d3/d3-format
    .call(d3.axisLeft(y).ticks(null, "s"))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.selectAll(".domain").remove());

  /**
   *
   * 绘制条形图内的柱子
   *
   */
  // 用于格式化 tooltip 文本内容
  // 堆叠的矩形条带所对应的数据点，采用 en 格式来显示数值（即使用千位逗号）
  // 如果所对应的数据不是数值时，则显式为 N/A
  // 参考 https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString
  const formatValue = x => isNaN(x) ? "N/A" : x.toLocaleString("en")

  // 绘制的步骤与一般的条形图会有所不同
  // 因为普通的条形图每一个条带都只是有一个矩形构成
  // 而堆叠条形图的每一个条带是由多个小的矩形依次堆叠而成的
  // 相应地，它们所绑定/对应的数据结构也不同
  // 普通的条形图所绑定的数据是一个数组，页面上每一个条带对应数组中的一个元素
  // 而堆叠条形图所绑定的数据是一个嵌套数组，页面上每一个堆叠层分别对应于数组的一个元素（一个系列数据，它也是一个数组），而同一堆叠层的不同小矩形则分别对应于嵌套数组中的一个元素
  // 所以需要在绘制堆叠条形图时需要进行数据「二次绑定」
  svg.append("g")
    .selectAll() // 返回一个选择集，其中虚拟/占位元素是 <g> 它们作为各系列的容器
    .data(series) // 绑定数据，每个容器 <g> 对应一个系列数据
    .join("g")
      .attr("fill", d => color(d.key)) // 设置颜色，不同系列/堆叠层对应不同的颜色
    // 基于原有的选择集进行「次级选择」，选择集会发生改变
    // 详细介绍可以查看这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#次级选择
    .selectAll("rect") // 使用 <rect> 元素为每一堆叠层绘制出一系列的小矩形
    // 返回的选择集是由多个分组（各个 <g> 容器中）的虚拟/占位 <rect> 元素构成的
    // ⚠️ 使用 select.selectAll() 所创建的新选择集会有多个分组
    // 由于新的选择集会创建多个分组，那么原来所绑定数据与（选择集中的）元素的对照关系会发生改变
    // 从原来的一对一关系，变成了一对多关系，所以新的选择集中的元素**不会**自动「传递/继承」父节点所绑定的数据
    // 所以如果要将原来选择集中所绑定的数据继续「传递」下去，就需要手动调用 selection.data() 方法，以显式声明要继续传递数据
    // 在这种场景下，该方法的入参应该是一个返回数组的**函数**
    // 每一个分组都会调用该方法，并依次传入三个参数：
    // * 当前所遍历的分组的父节点所绑定的数据 datum
    // * 当前所遍历的分组的索引 index
    // * 选择集的所有父节点 parent nodes
    // 详细介绍可以查看这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#绑定数据
    // 所以入参 D 是一个堆叠系列的数据（即 series 的一个嵌套数组）
    // 每个元素是一个二元数组，第一个元素是堆叠小矩阵的下边界；第二个元素是上边界；另外数组对象还具有一个属性 data 它包含原始数据（它也是一个二元数组，其中第一个元素 data[0] 就是所属的州的名称）
    // 这个函数的作用是为每个元素（数组对象）添加一个 key 属性（所属的系列名称/年龄分组），然后返回本身
    .data(D => D.map(d => (d.key = D.key, d)))
    .join("rect") // 将元素绘制到页面上
      // 为每个小矩形分别设置左上角 (x, y) 及其 width 和 height 来确定其定位和形状
      // 每个矩形的左上角横轴定位 x 由它所属的州的名称决定
      // 可以通过所绑定数据的属性 d.data.name 来获取
      // 使用横坐标轴的比例尺（带状比例尺）进行映射，求出具体的横轴坐标值
      .attr("x", d => x(d.data.name))
      // 每个矩形的左上角纵轴定位 y 由它的堆叠上边界决定
      // 可以通过它所绑定的数据（一个数组）的第二个元素 d[1] 来获取
      // 使用纵坐标轴的比例尺（线性比例尺）进行映射，求出具体的纵轴坐标值
      .attr("y", d => y(d[1]))
      // 每个矩形的高度
      // 由所绑定的数组的两个元素（上边界和下边界）之间的差值所决定
      // ⚠️ 注意这里的差值是 y(d[0]) - y(d[1]) 因为 svg 的坐标体系中向下是正方向
      // 所以下边界 d[0] 所对应的纵坐标值 y(d[0]) 会更大，减去 y(d[1]) 的值求出的差值才是高 度
      .attr("height", d => y(d[0]) - y(d[1]))
      // 每个矩形的宽度
      // 通过横轴的比例尺的方法 x.bandwidth() 获取 band 的宽度（不包含间隙 padding）
      .attr("width", x.bandwidth())
    // 最后为每个矩形 <rect> 元素之内添加 <title> 元素
    // 以便鼠标 hover 在相应的小矩形之上时，可以显示 tooltip 提示信息
    .append("title")
      // 设置 tooltip 的文本内容
      // 其中 d.data.name 是所属的州，d.key 是所属的年龄段
      // 而 d.data[d.key] 就是具体的人口数量
      .text(d => `${d.data.name} ${d.key}\n${formatValue(d.data[d.key])}`);
});